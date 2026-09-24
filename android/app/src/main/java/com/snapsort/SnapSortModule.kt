package com.snapsort

import android.Manifest
import android.app.Activity
import android.content.ContentUris
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import android.net.Uri
import android.os.Build
import android.provider.DocumentsContract
import android.provider.MediaStore
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import org.json.JSONArray
import org.json.JSONObject
import java.security.MessageDigest
import java.util.concurrent.Executors

private class Store(ctx: ReactApplicationContext): SQLiteOpenHelper(ctx,"snapsort.db",null,2) {
  override fun onCreate(db: SQLiteDatabase){db.execSQL("CREATE TABLE metadata (uri TEXT PRIMARY KEY, favorite INTEGER NOT NULL DEFAULT 0, category TEXT NOT NULL DEFAULT '', text TEXT NOT NULL DEFAULT '', hash TEXT NOT NULL DEFAULT '', visual_hash TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pending', modified INTEGER NOT NULL DEFAULT 0, size INTEGER NOT NULL DEFAULT 0)")}
  override fun onUpgrade(db: SQLiteDatabase,oldVersion:Int,newVersion:Int){if(oldVersion<2)db.execSQL("ALTER TABLE metadata ADD COLUMN visual_hash TEXT NOT NULL DEFAULT ''")}
}

class SnapSortModule(private val context:ReactApplicationContext):ReactContextBaseJavaModule(context),ActivityEventListener {
  private val io=Executors.newSingleThreadExecutor();private val store=Store(context)
  private var pendingDelete:Promise?=null;private var pendingPick:Promise?=null;private var pendingExport:Promise?=null;private var pendingImport:Promise?=null
  private val reqDelete=4101;private val reqPick=4102;private val reqExport=4103;private val reqImport=4104
  init{context.addActivityEventListener(this)}
  override fun getName()="SnapSort"
  private fun work(promise:Promise,block:()->Any?){io.execute{try{val value=block();context.runOnUiQueueThread{promise.resolve(value)}}catch(e:Exception){context.runOnUiQueueThread{promise.reject("SNAPSORT",e.message,e)}}}}
  private fun grants():String{if(Build.VERSION.SDK_INT<33)return if(context.checkSelfPermission(Manifest.permission.READ_EXTERNAL_STORAGE)==PackageManager.PERMISSION_GRANTED)"full" else "denied";if(context.checkSelfPermission(Manifest.permission.READ_MEDIA_IMAGES)==PackageManager.PERMISSION_GRANTED)return "full";if(Build.VERSION.SDK_INT>=34&&context.checkSelfPermission(Manifest.permission.READ_MEDIA_VISUAL_USER_SELECTED)==PackageManager.PERMISSION_GRANTED)return "partial";return "denied"}
  @ReactMethod fun permission(p:Promise){p.resolve(grants())}
  @ReactMethod fun permissionPrompted(p:Promise){p.resolve(context.getSharedPreferences("snapsort",0).getBoolean("permission_prompted",false))}
  @ReactMethod fun getTheme(p:Promise){p.resolve(context.getSharedPreferences("snapsort",0).getString("theme","system"))}
  @ReactMethod fun setTheme(mode:String,p:Promise){if(mode !in listOf("system","light","dark")){p.reject("THEME","Invalid mode");return};context.getSharedPreferences("snapsort",0).edit().putString("theme",mode).apply();p.resolve(null)}
  @ReactMethod fun requestPermission(p:Promise){context.getSharedPreferences("snapsort",0).edit().putBoolean("permission_prompted",true).apply();val activity=context.currentActivity as? PermissionAwareActivity?:run{p.reject("ACTIVITY","No activity");return};val perms=if(Build.VERSION.SDK_INT>=34)arrayOf(Manifest.permission.READ_MEDIA_IMAGES,Manifest.permission.READ_MEDIA_VISUAL_USER_SELECTED) else if(Build.VERSION.SDK_INT>=33)arrayOf(Manifest.permission.READ_MEDIA_IMAGES) else arrayOf(Manifest.permission.READ_EXTERNAL_STORAGE);activity.requestPermissions(perms,4105,PermissionListener{_,_,_->p.resolve(grants());true})}
  @ReactMethod fun pick(p:Promise){val activity=context.currentActivity?:run{p.reject("ACTIVITY","No activity");return};if(pendingPick!=null){p.reject("BUSY","Picker already open");return};pendingPick=p;try{val intent=Intent(Intent.ACTION_OPEN_DOCUMENT).apply{type="image/*";putExtra(Intent.EXTRA_ALLOW_MULTIPLE,true);addCategory(Intent.CATEGORY_OPENABLE);addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION or Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION)};activity.startActivityForResult(Intent.createChooser(intent,"Choose screenshots"),reqPick)}catch(e:Exception){pendingPick=null;p.reject("PICK",e)}}
  private fun valid(uri:Uri):Boolean = context.contentResolver.getType(uri)?.startsWith("image/")==true
  @ReactMethod fun list(p:Promise)=work(p){
    val out=Arguments.createArray();
    if(grants()!="denied"){
      val projection=arrayOf(MediaStore.Images.Media._ID,MediaStore.Images.Media.DISPLAY_NAME,MediaStore.Images.Media.DATE_ADDED,MediaStore.Images.Media.DATE_MODIFIED,MediaStore.Images.Media.SIZE,MediaStore.Images.Media.WIDTH,MediaStore.Images.Media.HEIGHT,MediaStore.Images.Media.RELATIVE_PATH)
      // RELATIVE_PATH exists on API 29; Android 10 is the minimum supported version.
      context.contentResolver.query(MediaStore.Images.Media.EXTERNAL_CONTENT_URI,projection,null,null,"${MediaStore.Images.Media.DATE_ADDED} DESC")?.use{cursor->
        val id=cursor.getColumnIndexOrThrow(MediaStore.Images.Media._ID);val name=cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DISPLAY_NAME);val date=cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_ADDED);val modified=cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_MODIFIED);val size=cursor.getColumnIndexOrThrow(MediaStore.Images.Media.SIZE);val width=cursor.getColumnIndexOrThrow(MediaStore.Images.Media.WIDTH);val height=cursor.getColumnIndexOrThrow(MediaStore.Images.Media.HEIGHT);val path=cursor.getColumnIndexOrThrow(MediaStore.Images.Media.RELATIVE_PATH)
        while(cursor.moveToNext()){val n=cursor.getString(name)?:"";val dir=cursor.getString(path)?:"";if(!n.contains("screenshot",true)&&!dir.contains("screenshot",true))continue;val uri=ContentUris.withAppendedId(MediaStore.Images.Media.EXTERNAL_CONTENT_URI,cursor.getLong(id));val key=uri.toString();val row=row(key,n,cursor.getLong(date)*1000,cursor.getLong(modified),cursor.getLong(size),cursor.getInt(width),cursor.getInt(height));out.pushMap(row)}
      }
    }
    // Picked URIs may be accessible without broad permission; revalidate every time.
    val db=store.readableDatabase;db.rawQuery("SELECT uri,modified,size FROM metadata WHERE uri NOT LIKE 'content://media/external/images/media/%'",null).use{c->while(c.moveToNext()){val uri=Uri.parse(c.getString(0));try{if(valid(uri)){val meta=queryPicked(uri);if(meta!=null)out.pushMap(row(uri.toString(),meta.first,System.currentTimeMillis(),c.getLong(1),meta.second,0,0))}}catch(_:Exception){}}}
    out
  }
  private fun queryPicked(uri:Uri):Pair<String,Long>?{context.contentResolver.query(uri,arrayOf(android.provider.OpenableColumns.DISPLAY_NAME,android.provider.OpenableColumns.SIZE),null,null,null)?.use{c->if(c.moveToFirst())return Pair(c.getString(0)?:"Selected image",c.getLong(1))};return null}
  private fun row(uri:String,name:String,date:Long,modified:Long,size:Long,width:Int,height:Int):WritableMap{var favorite=false;var category="";var text="";var hash="";var visualHash="";var status="pending";store.writableDatabase.rawQuery("SELECT favorite,category,text,hash,status,modified,size,visual_hash FROM metadata WHERE uri=?",arrayOf(uri)).use{c->if(c.moveToFirst()){favorite=c.getInt(0)==1;category=c.getString(1);text=c.getString(2);hash=c.getString(3);status=c.getString(4);visualHash=c.getString(7);if(c.getLong(5)!=modified||c.getLong(6)!=size)status="pending"}};return Arguments.createMap().apply{putString("id",uri);putString("uri",uri);putString("name",name);putDouble("date",date.toDouble());putDouble("modified",modified.toDouble());putDouble("size",size.toDouble());putInt("width",width);putInt("height",height);putBoolean("favorite",favorite);putString("category",category);putString("text",if(status=="pending")"" else text);putString("hash",if(status=="pending")"" else hash);putString("visualHash",if(status=="pending")"" else visualHash);putString("status",status)}}
  private fun ensure(uri:String){store.writableDatabase.execSQL("INSERT OR IGNORE INTO metadata(uri) VALUES(?)",arrayOf(uri))}
  @ReactMethod fun setFavorite(uri:String,value:Boolean,p:Promise)=work(p){ensure(uri);store.writableDatabase.execSQL("UPDATE metadata SET favorite=? WHERE uri=?",arrayOf(if(value)1 else 0,uri));null}
  @ReactMethod fun setCategory(uri:String,value:String,p:Promise)=work(p){ensure(uri);store.writableDatabase.execSQL("UPDATE metadata SET category=? WHERE uri=?",arrayOf(value,uri));null}
  @ReactMethod fun setIndex(uri:String,text:String,category:String,hash:String,error:String,p:Promise)=work(p){ensure(uri);val meta=mediaInfo(uri);store.writableDatabase.execSQL("UPDATE metadata SET text=?,category=CASE WHEN category='' THEN ? ELSE category END,hash=?,status=?,modified=?,size=? WHERE uri=?",arrayOf(text,category,hash,if(error.isEmpty())"indexed" else "failed",meta.first,meta.second,uri));null}
  private fun mediaInfo(uri:String):Pair<Long,Long>{try{context.contentResolver.query(Uri.parse(uri),arrayOf(MediaStore.Images.Media.DATE_MODIFIED,MediaStore.Images.Media.SIZE),null,null,null)?.use{c->if(c.moveToFirst())return Pair(c.getLong(0),c.getLong(1))}}catch(_:Exception){};val size=queryPicked(Uri.parse(uri))?.second?:0L;return Pair(0L,size)}
  @ReactMethod fun recognize(uri:String,p:Promise){try{val image=InputImage.fromFilePath(context,Uri.parse(uri));val recognizer=TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);recognizer.process(image).addOnSuccessListener{result->p.resolve(result.text)}.addOnFailureListener{e->p.reject("OCR",e)}.addOnCompleteListener{recognizer.close()}}catch(e:Exception){p.reject("OCR",e)}}
  @ReactMethod fun hash(uri:String,p:Promise)=work(p){val md=MessageDigest.getInstance("SHA-256");context.contentResolver.openInputStream(Uri.parse(uri)).use{stream->requireNotNull(stream){"Image unavailable"};val buffer=ByteArray(32768);while(true){val read=stream.read(buffer);if(read<0)break;md.update(buffer,0,read)}};md.digest().joinToString(""){"%02x".format(it)}}
  @ReactMethod fun setHashes(uri:String,hash:String,visualHash:String,p:Promise)=work(p){ensure(uri);val meta=mediaInfo(uri);store.writableDatabase.execSQL("UPDATE metadata SET hash=?,visual_hash=?,modified=?,size=? WHERE uri=?",arrayOf(hash,visualHash,meta.first,meta.second,uri));null}
  @ReactMethod fun visualHash(uri:String,p:Promise)=work(p){
    val parsed=Uri.parse(uri);val options=BitmapFactory.Options().apply{inJustDecodeBounds=true}
    context.contentResolver.openInputStream(parsed).use{requireNotNull(it){"Image unavailable"};BitmapFactory.decodeStream(it,null,options)}
    options.inSampleSize=maxOf(1,maxOf(options.outWidth,options.outHeight)/256);options.inJustDecodeBounds=false
    val source=context.contentResolver.openInputStream(parsed).use{requireNotNull(it){"Image unavailable"};BitmapFactory.decodeStream(it,null,options)}
    requireNotNull(source){"Cannot decode image"};val scaled=Bitmap.createScaledBitmap(source,9,8,true);if(scaled!==source)source.recycle()
    try {
      fun luminance(pixel: Int): Int =
        ((pixel shr 16 and 255) * 299) +
        ((pixel shr 8 and 255) * 587) +
        ((pixel and 255) * 114)
      var bits = 0L
      for (y in 0 until 8) {
        for (x in 0 until 8) {
          val left = luminance(scaled.getPixel(x, y))
          val right = luminance(scaled.getPixel(x + 1, y))
          bits = (bits shl 1) or (if (left > right) 1L else 0L)
        }
      }
      java.lang.Long.toHexString(bits).padStart(16, '0')
    }
    finally{scaled.recycle()}
  }
  private fun documentCanDelete(uri: Uri): Boolean {
    if (!DocumentsContract.isDocumentUri(context, uri)) return false
    return try {
      context.contentResolver.query(uri, arrayOf(DocumentsContract.Document.COLUMN_FLAGS), null, null, null)?.use { cursor ->
        cursor.moveToFirst() && (cursor.getInt(0) and DocumentsContract.Document.FLAG_SUPPORTS_DELETE) != 0
      } ?: false
    } catch (_: Exception) { false }
  }

  private fun mediaImageForDelete(source: Uri): Uri? {
    if (source.scheme != "content") return null
    val candidate = if (source.authority == MediaStore.AUTHORITY) source else
      try { MediaStore.getMediaUri(context, source) } catch (_: Exception) { null }
    val segments = candidate?.pathSegments ?: return null
    // Only a specific image row is valid. Photo-picker proxies and collection URIs are rejected.
    if (candidate.authority != MediaStore.AUTHORITY || segments.size != 4 ||
      segments[1] != "images" || segments[2] != "media") return null
    val id = segments[3].toLongOrNull() ?: return null
    if (id < 0) return null
    return MediaStore.Images.Media.getContentUri(segments[0], id)
  }

  @ReactMethod fun delete(uri:String,p:Promise){
    val activity=context.currentActivity?:run{p.reject("ACTIVITY","No activity");return}
    if(pendingDelete!=null){p.reject("BUSY","Delete already active");return}
    val source=Uri.parse(uri)
    if(documentCanDelete(source)){
      pendingDelete=p
      io.execute{
        try {
          val deleted=DocumentsContract.deleteDocument(context.contentResolver,source)
          if(deleted) store.writableDatabase.delete("metadata","uri=?",arrayOf(uri))
          context.runOnUiQueueThread{pendingDelete=null;p.resolve(deleted)}
        }catch(e:Exception){context.runOnUiQueueThread{pendingDelete=null;p.reject("DELETE",e)}}
      }
      return
    }
    if(Build.VERSION.SDK_INT<30){p.reject("UNSUPPORTED","Requires Android 11 or later");return}
    val target=mediaImageForDelete(source)?:run{
      p.reject("UNSUPPORTED","This photo cannot be deleted here. For a previously chosen photo, choose it again in Settings; cloud photos must be deleted in their gallery.");return
    }
    try{
      val request=MediaStore.createDeleteRequest(context.contentResolver,listOf(target))
      pendingDelete=p
      activity.startIntentSenderForResult(request.intentSender,reqDelete,null,0,0,0)
    }catch(e:IllegalArgumentException){pendingDelete=null;p.reject("DELETE","Android cannot delete this picker item by its media ID. Choose it again in Settings, or delete it in your gallery.")}
    catch(e:Exception){pendingDelete=null;p.reject("DELETE",e)}
  }
  @ReactMethod fun exportData(p:Promise){val activity=context.currentActivity?:run{p.reject("ACTIVITY","No activity");return};if(pendingExport!=null){p.reject("BUSY","Export in progress");return};pendingExport=p;try{activity.startActivityForResult(Intent(Intent.ACTION_CREATE_DOCUMENT).apply{addCategory(Intent.CATEGORY_OPENABLE);type="application/json";putExtra(Intent.EXTRA_TITLE,"snapsort-backup.json")},reqExport)}catch(e:Exception){pendingExport=null;p.reject("EXPORT",e)}}
  @ReactMethod fun importData(p:Promise){val activity=context.currentActivity?:run{p.reject("ACTIVITY","No activity");return};if(pendingImport!=null){p.reject("BUSY","Import in progress");return};pendingImport=p;try{activity.startActivityForResult(Intent(Intent.ACTION_OPEN_DOCUMENT).apply{addCategory(Intent.CATEGORY_OPENABLE);type="application/json"},reqImport)}catch(e:Exception){pendingImport=null;p.reject("IMPORT",e)}}
  @ReactMethod fun clearIndex(p:Promise)=work(p){store.writableDatabase.execSQL("UPDATE metadata SET text='',hash='',visual_hash='',status='pending'");null}
  private fun backup():String{val records=JSONArray();store.readableDatabase.rawQuery("SELECT uri,favorite,category,text,hash,status,modified,size,visual_hash FROM metadata",null).use{c->while(c.moveToNext()){records.put(JSONObject().apply{put("uri",c.getString(0));put("favorite",c.getInt(1));put("category",c.getString(2));put("text",c.getString(3));put("hash",c.getString(4));put("status",c.getString(5));put("modified",c.getLong(6));put("size",c.getLong(7));put("visualHash",c.getString(8))})}};return JSONObject().put("format","snapsort-1").put("records",records).toString()}
  private fun restore(json:String){val root=JSONObject(json);require(root.getString("format")=="snapsort-1"){"Unsupported backup"};val records=root.getJSONArray("records");require(records.length()<=100000){"Backup too large"};val db=store.writableDatabase;db.beginTransaction();try{for(i in 0 until records.length()){val o=records.getJSONObject(i);val uri=o.getString("uri");require(uri.startsWith("content://")){"Invalid image URI"};db.execSQL("INSERT OR REPLACE INTO metadata(uri,favorite,category,text,hash,status,modified,size,visual_hash) VALUES(?,?,?,?,?,?,?,?,?)",arrayOf(uri,if(o.optInt("favorite")==1)1 else 0,o.optString("category"),o.optString("text"),o.optString("hash"),o.optString("status","pending"),o.optLong("modified"),o.optLong("size"),o.optString("visualHash")))};db.setTransactionSuccessful()}finally{db.endTransaction()}}
override fun onActivityResult(
  activity: Activity,
  requestCode: Int,
  resultCode: Int,
  data: Intent?
) {
  when (requestCode) {
    reqDelete -> {
      val p = pendingDelete
      pendingDelete = null
      p?.resolve(resultCode == Activity.RESULT_OK)
    }

    reqPick -> {
      val p = pendingPick
      pendingPick = null
      if (resultCode != Activity.RESULT_OK) {
        p?.resolve(0)
        return
      }

      val uris = mutableListOf<Uri>()
      data?.data?.let { uris.add(it) }
      data?.clipData?.let { clip ->
        for (i in 0 until clip.itemCount) {
          uris.add(clip.getItemAt(i).uri)
        }
      }
      val grantedFlags = (data?.flags ?: 0) and
        (Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)

      work(p ?: return) {
        var count = 0
        for (uri in uris) {
          try {
            context.contentResolver.takePersistableUriPermission(uri, grantedFlags)
          } catch (_: Exception) {
            // Continue if this provider does not offer a persistable grant.
          }

          try {
            if (valid(uri)) {
              ensure(uri.toString())
              count++
            }
          } catch (_: Exception) {
            // Skip images that can no longer be accessed.
          }
        }
        count
      }
    }

    reqExport -> {
      val p = pendingExport
      pendingExport = null
      val uri = data?.data
      if (resultCode != Activity.RESULT_OK || uri == null) {
        p?.resolve(false)
        return
      }

      work(p ?: return) {
        context.contentResolver.openOutputStream(uri, "wt").use {
          requireNotNull(it).write(backup().toByteArray(Charsets.UTF_8))
        }
        true
      }
    }

    reqImport -> {
      val p = pendingImport
      pendingImport = null
      val uri = data?.data
      if (resultCode != Activity.RESULT_OK || uri == null) {
        p?.resolve(false)
        return
      }

      work(p ?: return) {
        val bytes = context.contentResolver.openInputStream(uri).use {
          requireNotNull(it).readBytes()
        }
        require(bytes.size < 25_000_000) { "Backup too large" }
        restore(String(bytes, Charsets.UTF_8))
        true
      }
    }
  }
}  override fun onNewIntent(intent:Intent){}
}

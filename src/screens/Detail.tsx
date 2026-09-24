import React from 'react';
import {Alert,Image,Pressable,ScrollView,Text,View} from 'react-native';
import Icon from '@react-native-vector-icons/material-icons';
import {Card} from '../components/UI';
import type {Screenshot} from '../types';
import {useTheme} from '../theme';
import {PAGE_PADDING} from '../theme/layout';
const categories=['Receipts','Travel','Conversations','Shopping','Notes','Other'];
export function Detail({item,onBack,onFavorite,onCategory,onDelete}:{item:Screenshot;onBack:()=>void;onFavorite:()=>void;onCategory:(value:string)=>void;onDelete:()=>Promise<boolean>}){
 const {colors:c}=useTheme();
 const confirmDelete=()=>Alert.alert('Delete screenshot?','Android will ask you to confirm permanent deletion.',[
  {text:'Keep',style:'cancel'},
  {text:'Continue',style:'destructive',onPress:()=>{void onDelete().then(ok=>{if(ok)onBack()}).catch(e=>Alert.alert('Could not delete photo',e instanceof Error?e.message:String(e)))}},
 ]);
 return <View style={{flex:1}}>
  <View style={{height:62,paddingHorizontal:PAGE_PADDING,flexDirection:'row',alignItems:'center',backgroundColor:c.bg,borderBottomWidth:1,borderColor:c.line}}>
   <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={onBack} hitSlop={8} style={{width:40,height:40,alignItems:'center',justifyContent:'center',borderRadius:12,backgroundColor:c.pale,marginRight:12}}><Icon name="arrow-back" size={21} color={c.ink}/></Pressable>
   <View style={{flex:1}}><Text style={{fontSize:17,fontWeight:'800',color:c.ink}}>Screenshot details</Text><Text numberOfLines={1} style={{fontSize:11,color:c.muted}}>{item.name||'Screenshot'}</Text></View>
   <Pressable accessibilityRole="button" accessibilityLabel={item.favorite?'Remove favorite':'Add favorite'} onPress={onFavorite} hitSlop={8} style={{width:40,height:40,alignItems:'center',justifyContent:'center'}}><Icon name={item.favorite?'star':'star-border'} size={23} color={c.ink}/></Pressable>
  </View>
  <ScrollView contentContainerStyle={{paddingHorizontal:PAGE_PADDING,paddingTop:14,paddingBottom:24}}>
   <Image source={{uri:item.uri}} resizeMode="contain" style={{width:'100%',height:260,backgroundColor:c.pale,borderRadius:16,marginBottom:10}}/>
   <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:12}}><Text style={{fontSize:12,color:c.muted}}>{new Date(item.date).toLocaleString()} · {(item.size/1024).toFixed(0)} KB</Text><Pressable accessibilityRole="button" onPress={confirmDelete} hitSlop={8} style={{flexDirection:'row',alignItems:'center',gap:4,padding:8}}><Icon name="delete-outline" size={18} color={c.danger}/><Text style={{fontSize:12,fontWeight:'700',color:c.danger}}>Delete</Text></Pressable></View>
   <Card><Text style={{fontSize:14,fontWeight:'700',color:c.ink,marginBottom:6}}>Recognized text</Text><Text selectable style={{fontSize:13,color:c.muted,lineHeight:19}}>{item.text||(item.status==='failed'?'Could not recognize text. Try scanning again.':'No text found yet. Scan to index this image.')}</Text></Card>
   <Card><Text style={{fontSize:14,fontWeight:'700',color:c.ink,marginBottom:9}}>Category</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>{categories.map(category=><Pressable accessibilityRole="button" key={category} onPress={()=>onCategory(category)} style={{borderRadius:10,paddingHorizontal:10,paddingVertical:7,backgroundColor:item.category===category?c.accent:c.pale}}><Text style={{fontSize:12,fontWeight:'700',color:item.category===category?c.onAccent:c.accent}}>{category}</Text></Pressable>)}</View></Card>
  </ScrollView>
 </View>
}

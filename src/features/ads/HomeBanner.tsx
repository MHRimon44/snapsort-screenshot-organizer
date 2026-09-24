import React,{useState} from 'react';
import {Text,View} from 'react-native';
import {BannerAd,BannerAdSize} from 'react-native-google-mobile-ads';
import {useTheme} from '../../theme';
import {HOME_BANNER_ID} from './config';
import {PAGE_PADDING} from '../../theme/layout';

export function HomeBanner({ready}:{ready:boolean}){
  const {colors:c}=useTheme();
  const [loaded,setLoaded]=useState(false);
  const [failed,setFailed]=useState(false);
  if(!ready||failed)return null;
  return <View style={{backgroundColor:c.surface,borderTopWidth:1,borderColor:c.line,paddingTop:loaded?7:0,paddingBottom:loaded?8:0,alignItems:'center'}}>
    {loaded?<Text style={{fontSize:10,color:c.muted,alignSelf:'flex-start',marginLeft:PAGE_PADDING,marginBottom:4}}>Advertisement</Text>:null}
    <BannerAd unitId={HOME_BANNER_ID} size={BannerAdSize.BANNER}
      onAdLoaded={()=>setLoaded(true)} onAdFailedToLoad={()=>setFailed(true)}/>
  </View>;
}

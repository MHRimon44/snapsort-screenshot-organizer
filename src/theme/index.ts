import React, {createContext, useContext} from 'react';

export type Palette = {bg:string;surface:string;ink:string;muted:string;accent:string;pale:string;line:string;danger:string;success:string;hero:string;heroText:string};
export const light:Palette={bg:'#F5F7FF',surface:'#FFFFFF',ink:'#17234A',muted:'#697493',accent:'#344EE8',pale:'#E9EDFF',line:'#E3E8F6',danger:'#D84660',success:'#16826A',hero:'#243CCB',heroText:'#FFFFFF'};
export const dark:Palette={bg:'#0E1530',surface:'#182344',ink:'#F5F7FF',muted:'#A9B4D2',accent:'#91A2FF',pale:'#263665',line:'#303C60',danger:'#FF8193',success:'#6FD8BB',hero:'#344DDD',heroText:'#FFFFFF'};
export const ThemeContext=createContext<{colors:Palette;mode:'system'|'light'|'dark';setMode:(mode:'system'|'light'|'dark')=>void}>({colors:light,mode:'system',setMode:()=>{}});
export const useTheme=()=>useContext(ThemeContext);

export type Screenshot = {id:string;uri:string;name:string;date:number;modified:number;size:number;width:number;height:number;favorite:boolean;status:'pending'|'indexed'|'failed';text:string;category:string;hash:string;visualHash:string};
export type PermissionState = 'full'|'partial'|'denied';
export type Tab = 'home'|'gallery'|'search'|'cleanup'|'settings';
export type ScanProgress = {done:number;total:number;running:boolean};

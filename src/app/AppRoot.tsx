import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StatusBar,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PAGE_PADDING } from '../theme/layout';
import Icon from '@react-native-vector-icons/material-icons';
import { useLibrary } from '../hooks/useLibrary';
import mobileAds, { AdsConsent } from 'react-native-google-mobile-ads';
import { HomeBanner } from '../features/ads/HomeBanner';
import { Home } from '../screens/Home';
import { Gallery } from '../screens/Gallery';
import { Detail } from '../screens/Detail';
import { Cleanup } from '../screens/Cleanup';
import { Settings } from '../screens/Settings';
import { Action, Card } from '../components/UI';
import { dark, light, ThemeContext } from '../theme';
import { native } from '../services/native';
import type { Screenshot, Tab } from '../types';
let adInitialization: Promise<unknown> | undefined;
function startAdsOnce(): Promise<unknown> {
  if (!adInitialization) {
    adInitialization = mobileAds()
      .initialize()
      .catch(error => {
        adInitialization = undefined;
        throw error;
      });
  }
  return adInitialization;
}
const nav: [Tab, string, string][] = [
  ['home', 'Home', 'home'],
  ['gallery', 'Library', 'photo-library'],
  ['search', 'Search', 'search'],
  ['cleanup', 'Cleanup', 'layers'],
  ['settings', 'Settings', 'settings'],
];
export function AppRoot() {
  const vm = useLibrary();
  const [adsReady, setAdsReady] = useState(false);
  useEffect(() => {
    let active = true;
    const initialize = async () => {
      try {
        if (!__DEV__) {
          try {
            await AdsConsent.gatherConsent();
          } catch {}
          const info = await AdsConsent.getConsentInfo();
          if (!info.canRequestAds) return;
        }
        await startAdsOnce();
        if (active) setAdsReady(true);
      } catch {}
    };
    void initialize();
    return () => {
      active = false;
    };
  }, []);
  const [tab, setTab] = useState<Tab>('home');
  const [selected, setSelected] = useState<string | null>(null);
  const [mode, setModeState] = useState<'system' | 'light' | 'dark'>('system');
  const system = useColorScheme();
  const c =
    mode === 'dark' || (mode === 'system' && system === 'dark') ? dark : light;
  useEffect(() => {
    void native
      .getTheme()
      .then(v => {
        if (v === 'dark' || v === 'light' || v === 'system') setModeState(v);
      })
      .catch(() => {});
  }, []);
  const setMode = (v: 'system' | 'light' | 'dark') => {
    setModeState(v);
    void native.setTheme(v);
  };
  const open = (item: Screenshot) => setSelected(item.id);
  const item = vm.items.find(x => x.id === selected);
  const go = (next: Tab) => {
    setTab(next);
    if (next === 'cleanup') void vm.indexDuplicates();
  };
  return (
    <ThemeContext.Provider value={{ colors: c, mode, setMode }}>
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.bg }}>
        <SafeAreaView
          edges={['bottom']}
          style={{ flex: 1, backgroundColor: c.bg }}
        >
          <StatusBar
            backgroundColor={c.headerStart}
            barStyle={c.bg === dark.bg ? 'light-content' : 'dark-content'}
          />
          {vm.error ? (
            <Text
              style={{ color: c.danger, padding: 10 }}
              onPress={() => vm.setError('')}
            >
              {vm.error} · tap to dismiss
            </Text>
          ) : null}
          {vm.busy ? (
            <ActivityIndicator color={c.accent} style={{ padding: 12 }} />
          ) : null}
          {!vm.busy &&
          vm.permission === 'denied' &&
          vm.items.length === 0 &&
          !selected ? (
            <View style={{ padding: PAGE_PADDING }}>
              <Card>
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: '800',
                    color: c.ink,
                    marginBottom: 8,
                  }}
                >
                  Find screenshots in seconds
                </Text>
                <Text
                  style={{ color: c.muted, lineHeight: 21, marginBottom: 18 }}
                >
                  Photo access was not granted. You can select photos, or enable
                  full access to find screenshots automatically. Recognition
                  stays on your phone.
                </Text>
                <Action
                  icon="add-photo-alternate"
                  label="Choose photos"
                  onPress={() => void vm.pick()}
                />
                <View style={{ height: 9 }} />
                <Action
                  icon="photo-library"
                  label="Allow library access"
                  secondary
                  onPress={() => void vm.request()}
                />
              </Card>
            </View>
          ) : item ? (
            <Detail
              item={item}
              onBack={() => setSelected(null)}
              onFavorite={() => void vm.favorite(item)}
              onCategory={v => void vm.category(item, v)}
              onDelete={() => vm.remove(item)}
            />
          ) : (
            <View style={{ flex: 1 }}>
              {tab === 'home' ? (
                <Home vm={vm} go={go} open={open} />
              ) : tab === 'gallery' ? (
                <Gallery vm={vm} open={open} />
              ) : tab === 'search' ? (
                <Gallery vm={vm} open={open} search />
              ) : tab === 'cleanup' ? (
                <Cleanup vm={vm} open={open} />
              ) : (
                <Settings vm={vm} />
              )}
            </View>
          )}
          {!item && tab === 'home' ? <HomeBanner ready={adsReady} /> : null}
          {!item ? (
            <View
              style={{
                height: 58,
                backgroundColor: c.surface,
                borderTopWidth: 1,
                borderColor: c.line,
                flexDirection: 'row',
              }}
            >
              {nav.map(([key, label, icon]) => (
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected: key === tab }}
                  key={key}
                  onPress={() => go(key)}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 3,
                    borderTopWidth: key === tab ? 2 : 2,
                    borderTopColor: key === tab ? c.accent : 'transparent',
                  }}
                >
                  <Icon
                    name={icon as never}
                    size={22}
                    color={key === tab ? c.accent : c.muted}
                  />
                  <Text
                    style={{
                      fontSize: 10,
                      color: key === tab ? c.accent : c.muted,
                      fontWeight: '700',
                    }}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </SafeAreaView>
      </SafeAreaView>
    </ThemeContext.Provider>
  );
}

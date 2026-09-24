import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/material-icons';
import { Action, Card, Header, Tile } from '../components/UI';
import type { LibraryController } from '../hooks/useLibrary';
import type { Screenshot, Tab } from '../types';
import { groupDuplicates } from '../services/categories';
import { useTheme } from '../theme';
import { PAGE_PADDING } from '../theme/layout';

export function Home({
  vm,
  go,
  open,
}: {
  vm: LibraryController;
  go: (tab: Tab) => void;
  open: (item: Screenshot) => void;
}) {
  const { colors: c } = useTheme();
  const indexed = vm.items.filter(item => item.status === 'indexed').length;
  const groups = groupDuplicates(vm.items);
  return (
    <View style={{ flex: 1 }}>
      <Header title="SnapSort" subtitle="Your screenshots, easy to find." />
      <ScrollView
        contentContainerStyle={{ padding: PAGE_PADDING, paddingBottom: 24 }}
      >
        <View
          style={{
            backgroundColor: c.hero,
            borderRadius: 20,
            padding: 17,
            marginBottom: 14,
            borderWidth: 1,
            borderColor: c.line,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  letterSpacing: 1,
                  color: c.muted,
                }}
              >
                YOUR LIBRARY
              </Text>
              <Text
                style={{
                  fontSize: 36,
                  fontWeight: '800',
                  letterSpacing: -1.5,
                  color: c.heroText,
                  marginTop: 2,
                }}
              >
                {vm.items.length}
              </Text>
              <Text style={{ fontSize: 12, color: c.muted }}>
                {indexed} searchable · stored on this device
              </Text>
            </View>
            <View
              style={{
                width: 50,
                height: 50,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: c.surface,
              }}
            >
              <Icon name="collections" size={25} color={c.accent} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 15 }}>
            <View style={{ flex: 1 }}>
              <Action
                icon="search"
                label="Find a shot"
                onPress={() => go('search')}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Action
                icon="document-scanner"
                label="Scan text"
                secondary
                onPress={() => void vm.scan()}
                disabled={vm.progress.running}
              />
            </View>
          </View>
        </View>
        {vm.progress.running ? (
          <Card>
            <Text style={{ color: c.ink, marginBottom: 10 }}>
              Reading text · {vm.progress.done} of {vm.progress.total}
            </Text>
            <Action
              icon="close"
              label="Stop after this image"
              secondary
              onPress={vm.cancel}
            />
          </Card>
        ) : null}
        <Pressable
          accessibilityRole="button"
          onPress={() => go('cleanup')}
          style={{
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.line,
            borderRadius: 16,
            padding: 14,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 11,
            marginBottom: 19,
          }}
        >
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              backgroundColor: c.pale,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="content-copy" size={19} color={c.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.ink, fontWeight: '700', fontSize: 14 }}>
              Review duplicates
            </Text>
            <Text style={{ color: c.muted, fontSize: 12, marginTop: 2 }}>
              {groups.length === 0
                ? 'No suggested matches yet'
                : `${groups.length} suggested ${groups.length === 1 ? 'group' : 'groups'}`}
            </Text>
          </View>
          <Icon name="chevron-right" size={22} color={c.muted} />
        </Pressable>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 11,
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: '800', color: c.ink }}>
            Recently added
          </Text>
          <Text
            onPress={() => go('gallery')}
            accessibilityRole="button"
            style={{ fontSize: 12, fontWeight: '700', color: c.accent }}
          >
            View all
          </Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
          }}
        >
          {vm.items.slice(0, 6).map(item => (
            <Tile
              key={item.id}
              item={item}
              onPress={() => open(item)}
              onFavorite={() => void vm.favorite(item)}
            />
          ))}
        </View>
        {vm.items.length === 0 ? (
          <Text style={{ color: c.muted, lineHeight: 20 }}>
            No screenshots yet. Choose photos or allow access in Settings.
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

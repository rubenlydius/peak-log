import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}>
      <NativeTabs.Trigger name="(index)">
        <NativeTabs.Trigger.Label>Mountains</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="mountain.2.fill" md="landscape"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="compass">
        <NativeTabs.Trigger.Label>Compass</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="safari.fill" md="explore"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="person.fill" md="person"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

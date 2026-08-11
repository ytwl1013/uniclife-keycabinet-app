import { useLocalSearchParams } from 'expo-router';

import { ScanFlow, ScanMode } from '@/features/scan/components/scan-flow';
import { allowSampleQrPreview } from '@/mocks';

export default function ScanRoute() {
  const params = useLocalSearchParams<{ mode?: string | string[]; sample?: string | string[] }>();
  const rawMode = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const rawSample = Array.isArray(params.sample) ? params.sample[0] : params.sample;
  const mode: ScanMode = rawMode === 'initialize' ? 'initialize' : 'join';
  return <ScanFlow mode={mode} sample={allowSampleQrPreview(rawSample === '1')} />;
}

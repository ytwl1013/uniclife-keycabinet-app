export type CabinetCommandResult = {
  success: boolean;
  failureReason?: string;
};

export interface KeyCabinetAdapter {
  openSlot(input: { cabinetCode: string; slotCode: string; requestId: string }): Promise<CabinetCommandResult>;
  getStatus(input: { cabinetCode: string }): Promise<{ online: boolean; raw?: unknown }>;
}

export class NotConfiguredKeyCabinetAdapter implements KeyCabinetAdapter {
  async openSlot(): Promise<CabinetCommandResult> {
    return { success: false, failureReason: 'KEY_CABINET_ADAPTER_NOT_CONFIGURED' };
  }

  async getStatus(): Promise<{ online: boolean }> {
    return { online: false };
  }
}

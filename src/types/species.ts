export interface ICommodityCode {
  code: string;
  description: string;
  faoName: string;
}

export interface ICommodityCodeExtended extends ICommodityCode {
  stateLabel: string;
  presentationLabel: string;
}
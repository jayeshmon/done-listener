import mongoose from 'mongoose';

// Define the DroneData schema

const DroneTripDataSchema = new mongoose.Schema({
  t: String,
  VD: String,
  FV: String,
  AD: Number,
  PS: String,
  v: String,
  DM: String,
  T: String,
  l: String,
  g: String,
  s: String,
  ALT: String,
  SN: String,
  HD: String,
  FL_MOD: String,
  MC: String,
  MN: String,
  MV: String,
  IV: String,
  ROLL: String,
  YAW: String,
  PITCH: String,
  WTR_QTY: String,
  CONLQD: String,
  FLW_RT: String,
  GPSCNT: String,
  TNKLVL: String,
  PLAN_AREA: String,
  COV_AREA: String,
  BOUNDARY: String,
  SS: String,
  p: Number,
  FN: String
}, { collection: 'drone_trip_data' });

const DroneTripData = mongoose.model('DroneTripData', DroneTripDataSchema);
export { DroneTripData };

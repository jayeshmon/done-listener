require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const Ajv = require('ajv');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

// Connect to MongoDB
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true ,authSource: 'admin'})
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB', err));

// Define the drone data schema
const droneDataSchema = new mongoose.Schema({
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
}, { collection: 'drone_data' });

const DroneData = mongoose.model('DroneData', droneDataSchema);

// Define AJV schema
const ajv = new Ajv();
const validate = ajv.compile({
  type: 'object',
  properties: {
    t: { type: 'string' },
    VD: { type: 'string' },
    FV: { type: 'string' },
    AD: { type: 'number' },
    PS: { type: 'string' },
    v: { type: 'string' },
    DM: { type: 'string' },
    T: { type: 'string' },
    l: { type: 'string' },
    g: { type: 'string' },
    s: { type: 'string' },
    ALT: { type: 'string' },
    SN: { type: 'string' },
    HD: { type: 'string' },
    FL_MOD: { type: 'string' },
    MC: { type: 'string' },
    MN: { type: 'string' },
    MV: { type: 'string' },
    IV: { type: 'string' },
    ROLL: { type: 'string' },
    YAW: { type: 'string' },
    PITCH: { type: 'string' },
    WTR_QTY: { type: 'string' },
    CONLQD: { type: 'string' },
    FLW_RT: { type: 'string' },
    GPSCNT: { type: 'string' },
    TNKLVL: { type: 'string' },
    PLAN_AREA: { type: 'string' },
    COV_AREA: { type: 'string' },
    BOUNDARY: { type: 'string' },
    SS: { type: 'string' },
    p: { type: 'number' },
    FN: { type: 'string' }
  },
  required: ['t', 'VD', 'FV', 'AD', 'PS', 'v', 'DM', 'T', 'l', 'g', 's', 'ALT', 'SN', 'HD', 'FL_MOD', 'MC', 'MN', 'MV', 'IV', 'ROLL', 'YAW', 'PITCH', 'WTR_QTY', 'CONLQD', 'FLW_RT', 'GPSCNT', 'TNKLVL', 'PLAN_AREA', 'COV_AREA', 'BOUNDARY', 'SS', 'p', 'FN'],
  additionalProperties: false
});

// Listener endpoint
app.post('/drone-data', async (req, res) => {
  const data = req.body;
  
  if (!Array.isArray(data)) {
    return res.status(400).send([{ instancePath: "", schemaPath: "#/type", keyword: "type", params: { type: "array" }, message: "must be array" }]);
  }
  
  const errors = [];
  
  for (const item of data) {
    const valid = validate(item);
    if (!valid) {
      errors.push({ item, errors: validate.errors });
    }
  }

  if (errors.length) {
    return res.status(400).send(errors);
  }

  try {
    await DroneData.insertMany(data);
    res.status(201).send('Data saved successfully');
  } catch (err) {
    console.error('Error saving data:', err); // Log the error
    res.status(500).send('Error saving data');
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

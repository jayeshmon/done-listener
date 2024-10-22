require('dotenv').config();
const bodyParser = require('body-parser');
const express = require('express');
const mongoose = require('mongoose');
const Ajv = require('ajv');
const cors = require('cors');
const { createClient } = require('redis');
const nodemailer = require('nodemailer');
const app = express();
app.use(express.json());

// Apply CORS middleware with options
app.use(cors());

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const REDIS_DB = process.env.REDIS_DB || 1;

app.use(bodyParser.urlencoded({ extended: true }));
// Set up nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Use environment variable for email
    pass: process.env.EMAIL_PASS, // Use environment variable for password
  },
});




// Connect to MongoDB
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true, authSource: 'admin' })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB', err));

// Connect to Redis
const redisClient = createClient({ url: `redis://localhost:${REDIS_PORT}` });

redisClient.on('error', (err) => {
  console.error('Could not connect to Redis', err);
});

redisClient.connect().then(() => {
  console.log('Connected to Redis');
  redisClient.select(REDIS_DB); // Default Redis DB
});

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

const droneTripDataSchema = new mongoose.Schema({
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

const DroneData = mongoose.model('DroneData', droneDataSchema);
const DroneTripData = mongoose.model('DroneTripData', droneTripDataSchema);

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
  required: ['t', 'VD', 'FV', 'AD', 'PS', 'v', 'DM', 'T', 'l', 'g', 's', 'ALT', 'SN', 'HD', 'FL_MOD', 'MC', 'MN', 
   'IV', 'ROLL', 'YAW', 'PITCH', 'WTR_QTY', 'CONLQD', 'FLW_RT', 'GPSCNT', 'TNKLVL', 'PLAN_AREA', 'COV_AREA', 'BOUNDARY', 'SS', 'p', 'FN'],
  additionalProperties: false
});

// Listener endpoint
app.post('/parsedata', async (req, res) => {
  const vltjson = req.body.vltjson;

  if (!vltjson) {
    return res.status(400).send([{ instancePath: "", schemaPath: "#/required", keyword: "required", params: { missingProperty: "vltjson" }, message: "vltjson key is missing" }]);
  }

  let data;
  try {
    data = JSON.parse(vltjson);
  } catch (error) {
    return res.status(400).send([{ instancePath: "", schemaPath: "#/type", keyword: "type", params: { type: "array" }, message: "vltjson must be a valid JSON array" }]);
  }

  if (!Array.isArray(data)) {
    return res.status(400).send([{ instancePath: "", schemaPath: "#/type", keyword: "type", params: { type: "array" }, message: "vltjson must be an array" }]);
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

  //try {
    console.log(data);
    // Insert data into the correct collection based on the 'AD' field
    if (data[0].AD === 1  ) {
     // sendEmail('Drone Activated', 'Drone Activated ',data[0].t);

    
    const ld=  await redisClient.get(data[0].t);
     if(JSON.parse(ld).AD==2){
      await DroneTripData.insertMany(data);
    }
    
      const lastData = data[data.length - 1];
      await redisClient.set(lastData.t, JSON.stringify(lastData));
      // Insert into drone_data collection
      await DroneData.insertMany(data);

      // Switch to Redis DB 2 and store the last packet
      

      // Optionally, switch back to the default Redis DB after storing data in DB 2
      await redisClient.select(REDIS_DB);
      res.status(201).send({ 'response': 'Data saved successfully' });

    } else if (data[0].AD === 2) {
      //sendEmail('Drone DeActivated', 'Drone DeActivated ' , data[0].t);
      const ld=  await redisClient.get(data[0].t);
     if(JSON.parse(ld).AD==1){
      await DroneTripData.insertMany(data);
    }
    
           // Switch to Redis DB 2 and store the last packet
           await redisClient.select(1);
           const lastData = data[data.length - 1];
           await redisClient.set(lastData.t, JSON.stringify(lastData));
     
           // Optionally, switch back to the default Redis DB after storing data in DB 2
           await redisClient.select(REDIS_DB);
           lastData.l=lastData?.l?.split(',')[lastData?.l?.split(',').length-1];
           lastData.g=lastData?.g?.split(',')[lastData?.g?.split(',').length-1];
           await redisClient.set(lastData.t, JSON.stringify(lastData));
           console.log(lastData);

   
      res.status(201).send({ 'response': 'Data saved successfully to 2' });
    }

   
  //} catch (err) {
    //console.error('Error saving data:', err); // Log the error
    //res.status(500).send('Error saving data');
  //}
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

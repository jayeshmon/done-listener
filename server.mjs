import express from 'express';
import mongoose from 'mongoose';
import { User } from './models/User.mjs';
import { Drone } from './models/Drone.mjs';
import { DroneData } from './models/DroneData.mjs';
import { DroneTripData } from './models/DroneTripData.mjs';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createClient } from 'redis';
import https from 'https';
import fs from 'fs';
import path from 'path';
//npmconst cors = require('cors');
import cors from 'cors';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();
const MONGO_URI = process.env.MONGO_URI;
const API_PORT = process.env.API_PORT;
const PROD = process.env.PROD;
const redisClient = createClient({
    socket: {
      host: 'localhost',
      port: 6379 // For example, 6379
    }
  });
  redisClient.connect().catch(console.error);
  redisClient.select(1);
 
const app = express();
app.use(express.json());
app.use(cors());




// Connect to MongoDB
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true, authSource: 'admin' })
    .then(() => console.log({'message':'Connected to MongoDB'}))
    .catch(err => console.error('Could not connect to MongoDB', err));

const secret = 'Astrazeneca9763'; // Use a strong secret in production
const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const day = String(today.getDate()).padStart(2, '0');
 // console.log(`${year}-${month}-${day}`);
  return `${year}-${month}-${day}`;
};

app.post('/register', async (req, res) => {
    const { username, password, role,mobile,companyName } = req.body;
   // console.log(username);
    if (!username || !password || !role) {
        return res.status(400).send({'message':'Username, password, and role are required'});
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username, password: hashedPassword, role,mobile,companyName });
        await user.save();
        res.status(201).send({'message':'User registered'});
    } catch (err) {
        console.error('Error registering user', err.message);
        if (err.code === 11000) {
            return res.status(400).send({'message':'Username already exists'});
        }
        res.status(400).send({'message':'Error registering user: ' + err.message});
    }
});
app.get('/users', async (req, res) => {
    try {
      const users = await User.find({});
      res.json(users);
    } catch (err) {
      res.status(500).json({ message: 'Failed to fetch users', error: err.message });
    }
  });
  app.get('/users/user', async (req, res) => {
    try {
      const users = await User.find({ role: 'user' });
      res.json(users);
    } catch (err) {
      res.status(500).json({ message: 'Failed to fetch users', error: err.message });
    }
  });
// Edit user route
app.put('/users/:username', async (req, res) => {
    const { username } = req.params;
    const { password, role, mobile, companyName } = req.body;

    try {
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(404).send({'message':'User not found'});
        }

        const updatedFields = { role, mobile, companyName };

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updatedFields.password = hashedPassword;
        }

        const updatedUser = await User.findOneAndUpdate(
            { username },
            updatedFields,
            { new: true }
        );

        res.status(200).json(updatedUser);
    } catch (err) {
        res.status(400).send({'message':'Error updating user: ' + err.message});
    }
});
app.post('/users/delete/:username', async (req, res) => {
    const { username } = req.params;

    try {
        // Find user by username and delete
        const user = await User.findOneAndDelete({ username });

        if (!user) {
            return res.status(404).send({'message':'User not found'});
        }

        res.status(200).send({'message':'User deleted'});
    } catch (err) {
        res.status(400).send({'message':'Error deleting user: ' + err.message});
    }
});
// Login route
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(400).json({ authenticated: false, role: null, "message": 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ authenticated: false, role: null, "message": 'Invalid credentials' });
        }

        const payload = { id: user._id, role: user.role };
        const token = jwt.sign(payload, secret, { expiresIn: '1h' });

        res.json({ authenticated: true, role: user.role, token });
    } catch (err) {
        res.status(500).send({'message':'Server error'});
    }
});

// Middleware to check authentication
const auth = (roles = []) => {
    return (req, res, next) => {
        const token = req.header('x-auth-token');
        //console.log(token);
        if (!token) {
            return res.status(401).json({ 'message': 'No token, authorization denied' });
        }

        try {
            const decoded = jwt.verify(token, secret);
            req.user = decoded;
            if (roles.length && !roles.includes(req.user.role)) {
                return res.status(403).json({ 'message': 'Forbidden: Access is denied' });
            }
            next();
        } catch (err) {
            res.status(401).json({ 'message': 'Token is not valid' });
        }
    };
};

// Protected route example
app.get('/admin', auth(['admin']), (req, res) => {
    res.send('Admin content');
});

// Add a drone
app.post('/drones', async (req, res) => {
    const { imei, drone_name, model,  range,assignedUser } = req.body;
    try {
        const drone = new Drone({ imei, drone_name, model, range ,assignedUser});
        await drone.save();
        res.status(201).send({'message':'Drone added'});
    } catch (err) {
        res.status(400).send({'message':'Error adding drone ' + err.message});
    }
});

// Get all drones
app.get('/drones', async (req, res) => {
    try {
        const drones = await Drone.find();
        res.json(drones);
    } catch (err) {
        res.status(500).send({'message':'Server error'});
    }
});

// Get a single drone
app.get('/drones/:id', async (req, res) => {
    try {
        const drone = await Drone.findById(req.params.id);
        if (!drone) {
            return res.status(404).send({'message':'Drone not found'});
        }
        res.json(drone);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// Update a drone
app.put('/drones/:id', async (req, res) => {
    const { imei, drone_name, model, status, range ,assignedUser} = req.body;
//console.log("*************************");
  //  console.log(assignedUser);
    //console.log("*************************");
    try {
        const drone = await Drone.findById(req.params.id);
        if (!drone) {
            return res.status(404).send({'message':'Drone not found'});
        }
        drone.imei = imei;
        drone.drone_name = drone_name;
        drone.model = model;
        drone.status = status;
        drone.range = range;
        drone.assignedUser=assignedUser;
        await drone.save();
        res.send({'message':' Drone updated  '});
    } catch (err) {
        res.status(400).send({'message':'Error updating drone: ' + err.message});
    }
});

// Delete a drone
app.post('/drones/delete/:imei', async (req, res) => {
    const { imei } = req.params;
    try {
        const drone = await Drone.findOneAndDelete({ imei });
        if (!drone) {
            return res.status(404).send({ 'message': 'Drone not found' });
        }
        res.send({ 'message': 'Drone deleted' });
    } catch (err) {
        res.status(400).send({ 'message': 'Error deleting drone: ' + err.message });
    }
});
app.post('/assign-drones/:username', async (req, res) => {
    const { username } = req.params;
    const { droneIds } = req.body; // Expecting an array of drone IDs

    try {
        // Find the user by username
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).send({'message':'User not found'});
        }

        // Update drones with the user reference
        await Drone.updateMany(
            { _id: { $in: droneIds } },
            { $set: { user: user._id } }
        );

        // Add drone IDs to user's drones array
        user.drones = [...user.drones, ...droneIds];
        await user.save();

        res.status(200).send('Drones assigned to user');
    } catch (err) {
        res.status(400).send({'message':'Error assigning drones: ' + err.message});
    }
});


  app.get('/lastdata/:imei', async (req, res) => {
    try {
      const { imei } = req.params;
  
      // Fetch the latest data from Redis using the IMEI as the key
      const redisData = await redisClient.get(imei);
  
      if (!redisData) {
        return res.status(404).json({ message: 'Data not found for the given IMEI' });
      }
  
      // Parse the Redis data (assuming it's stored as a JSON string)
      const latestData = JSON.parse(redisData);
  
      // Return the latest data
      res.json(latestData);
    } catch (error) {
      console.error('Error fetching data from Redis:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  app.get('/alldronesdata', async (req, res) => {
    if (!redisClient.isOpen) {
      console.log("redis disconnected");
      await redisClient.connect();
      await redisClient.select(1);
    }
  
    try {
      // Fetch all drones from MongoDB and populate the assignedUser field
      const drones = await Drone.find().populate('assignedUser', 'username'); // Only fetch username
  
      // Create an array to hold the combined data
      const combinedData = [];
  
      // Iterate over the drones to fetch additional data from Redis
      for (const drone of drones) {
        // Fetch the latest data from Redis using the drone's IMEI as the key
        //console.log(drone.imei);
        let redisData = "";
        try {
          redisData = await redisClient.get(drone.imei);
          // console.log(redisData);
        } catch (err) {
          console.log(err.message);
        }
  
        // Parse the Redis data (assuming it's stored as a JSON string)
        const latestData = redisData ? JSON.parse(redisData) : {};
  
        // Merge MongoDB data with Redis data
        const combinedDroneData = {
          ...drone.toObject(), // Convert Mongoose document to plain JavaScript object
          latestData,         // Add latest data from Redis
          assignedUserName: drone.assignedUser ? drone.assignedUser.username : null // Add assigned user's username
        };
  
        // Add the combined data to the array
        combinedData.push(combinedDroneData);
      }
  
      // Return the combined data
      res.json(combinedData);
    } catch (error) {
      console.error('Error fetching drones:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.get('/dronesdata/:username', async (req, res) => {
    try {
      const { username } = req.params;
  
      // Find the user by username
      const user = await User.findOne({ username });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      // Find drones assigned to the user
      const drones = await Drone.find({ assignedUser: user._id });
  
      // Create an array to hold the combined data
      const combinedData = [];
  
      // Iterate over the drones to fetch additional data from Redis
      for (const drone of drones) {
        // Fetch the latest data from Redis using the drone's IMEI as the key
        const redisData = await redisClient.get(drone.imei);

        // Parse the Redis data (assuming it's stored as a JSON string)
        const latestData = redisData ? JSON.parse(redisData) : {};
  
        // Merge MongoDB data with Redis data
        const combinedDroneData = {
          ...drone.toObject(), // Convert Mongoose document to plain JavaScript object
          latestData,         // Add latest data from Redis
        };
  
        // Add the combined data to the array
        combinedData.push(combinedDroneData);
      }
  
      // Return the combined data
      res.json(combinedData);
    } catch (error) {
      console.error('Error fetching drones:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
app.get('/dronedata/:imei', async (req, res) => {
  try {
    const { imei } = req.params;
//console.log(imei);
    // Find the drone by imei
    const drone = await Drone.findOne({ imei });
    if (!drone) {
      return res.status(404).json({ message: 'Drone not found' });
    }

    // Fetch the latest data from Redis using the drone's IMEI as the key
    const redisData = await redisClient.get(drone.imei);

    // Parse the Redis data if it exists, otherwise use an empty object
    const latestData = redisData ? JSON.parse(redisData) : {};

    // Combine the drone data with the latest data
    const combinedData = {
      ...drone.toObject(), // Convert the Mongoose document to a plain JavaScript object
      latestData,
    };

    // Return the combined data in the response
    res.json(combinedData);
  } catch (error) {
    console.error('Error fetching drones:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/dronedatabydate/:t/:startTime/:endTime', async (req, res) => {
  try {
    const { t, startTime, endTime } = req.params;

    //console.log(t);
    // Query the database for drone data with the specified identifier and within the time range
    const droneData = await DroneData.find({
      't': t, 
     'T': {
        '$gte': startTime, 
        '$lte': endTime
    }
  }
    );

    if (!droneData || droneData.length === 0) {
      //return res.status(404).json({ message: 'No drone data found for the given identifier and time range' });
    }

    // Return the drone data in the response
    res.json(droneData);
  } catch (error) {
    console.error('Error fetching drone data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
// Get the sum of kilometers covered by all drones


app.get('/trip', async (req, res) => {
  try {
    // Helper function to get today's date in "YYYY-MM-DD" format
    const todayDate = getTodayDate();
    //console.log(todayDate);

    // Fetch the total kilometers covered by all drones from MongoDB, filtered by today's date
    const totalKmData = await DroneTripData.aggregate([
      {
        '$match': {
          T: { '$regex': `^${todayDate}` },
          AD:2 // Match only today's date
        }
      },
      {
        $group: {
          _id: null,
          totalKmCovered: {
            '$sum': { '$toDouble': "$COV_AREA" } // Convert COV_AREA to double before summing
          }
        }
      }
    ]);

    const totalKmCovered = totalKmData.length > 0 ? totalKmData[0].totalKmCovered : 0;
    res.json({ totalKmCovered });
  } catch (error) {
    console.error('Error fetching drone trip data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
app.get('/trip/user/:username', async (req, res) => {
  try {
    const { username } = req.params;

    // Find the user by their username
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find all drones assigned to the user
    const drones = await Drone.find({ assignedUser: user._id });

    // Get an array of all drone IMEIs
    const droneImeis = drones.map(drone => drone.imei);

    if (droneImeis.length === 0) {
      return res.json({ totalKmCovered: 0 }); // No drones assigned
    }

    // Get today's date in "YYYY-MM-DD" format
    const todayDate = getTodayDate();

    // Fetch the total kilometers covered for the user's drones, filtered by today's date
    const totalKmData = await DroneTripData.aggregate([
      {
        '$match': {
          T: { '$regex': `^${todayDate}` },
          AD:2,  // Match only today's date
          t: { '$in': droneImeis }  // Match only drones assigned to this user
        }
      },
      {
        $group: {
          _id: null,
          totalKmCovered: {
            '$sum': { '$toDouble': "$COV_AREA" }  // Convert COV_AREA to double before summing
          }
        }
      }
    ]);

    // Calculate the total kilometers covered
    const totalKmCovered = totalKmData.length > 0 ? totalKmData[0].totalKmCovered : 0;

    // Return the result
    res.json({ totalKmCovered });
    
  } catch (error) {
    console.error('Error fetching user trip data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});






app.get('/trip/:imei/km', async (req, res) => {
  const { imei } = req.params;

  try {
    const todayDate = getTodayDate();
    //console.log(todayDate);

    // Fetch the total kilometers covered for the specified drone from MongoDB, filtered by today's date
    const droneKmData = await DroneTripData.aggregate([
      {
        $match: {
          t: imei,
          AD:2,
          T: { '$regex': `^${todayDate}` } // Match only today's date
        }
      },
      {
        $group: {
          _id: "$imei",
          totalKmCovered: {
            '$sum': { '$toDouble': "$COV_AREA" } // Convert COV_AREA to double before summing
          }
        }
      }
    ]);

    const kmCovered = droneKmData.length > 0 ? droneKmData[0].totalKmCovered : 0;
    res.json({ imei, kmCovered });
  } catch (error) {
    console.error('Error fetching drone trip data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});









app.get('/flying-hours', async (req, res) => {
  try {
    const todayDate = getTodayDate();

    // Fetch all data for today's date
    const flights = await DroneTripData.aggregate([
      {
        '$match': {
          T: { '$regex': `^${todayDate}` }, // Match today's date
          AD: { '$in': [1, 2] } // Match only AD = 1 (start) and AD = 2 (end)
        }
      },
      {
        $sort: { imei: 1, T: 1 } // Sort by imei and timestamp
      }
    ]);

    let totalFlyingHours = 0;

    // Calculate flying hours per drone
    const droneFlyingTimes = {};
   console.log(flights);
    flights.forEach((flight) => {
      const { imei, AD, T } = flight;
      
      if (!droneFlyingTimes[imei]) {
        droneFlyingTimes[imei] = { start: null, hours: 0 };
      }

      if (AD === 1) {
        // AD=1 is the start of the flight
        droneFlyingTimes[imei].start = new Date(T);
      } else if (AD === 2 && droneFlyingTimes[imei].start) {
        // AD=2 is the end of the flight, calculate the difference
        const endTime = new Date(T);
        const flightDuration = (endTime - droneFlyingTimes[imei].start) / 1000 / 60 / 60; // Convert milliseconds to hours
        droneFlyingTimes[imei].hours += flightDuration;
        droneFlyingTimes[imei].start = null; // Reset the start time for the next flight
        totalFlyingHours += flightDuration;
      }
    });

    res.json({ totalFlyingHours });
  } catch (error) {
    console.error('Error fetching flying hours data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});










app.get('/flying-hours/user/:username', async (req, res) => {
  //try {
    const { username } = req.params;
console.log(username);
    // Find the user by their username
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find all drones assigned to the user
    const drones = await Drone.find({ assignedUser: user._id });

    // Get an array of all drone IMEIs
    const droneImeis = drones.map(drone => drone.imei);
console.log(droneImeis)
    if (droneImeis.length === 0) {
      return res.json({ totalFlyingHours: 0 }); // No drones assigned
    }

    const todayDate = getTodayDate();

    // Fetch data for user's drones for today's date
    const flights = await DroneTripData.aggregate([
      {
        '$match': {
          T: { '$regex': `^${todayDate}` }, // Match today's date
          AD: { '$in': [1, 2] }, // Match AD = 1 (start) and AD = 2 (end)
          t: { '$in': droneImeis } // Filter by user's drones
        }
      },
      {
        $sort: { imei: 1, T: 1 } // Sort by imei and timestamp
      }
    ]);
console.log(flights);
    let totalFlyingHours = 0;

    // Calculate flying hours for user's drones
    const droneFlyingTimes = {};
    flights.forEach((flight) => {
      const { imei, AD, T } = flight;

      if (!droneFlyingTimes[imei]) {
        droneFlyingTimes[imei] = { start: null, hours: 0 };
      }

      if (AD === 1) {
        // AD=1 is the start of the flight
        droneFlyingTimes[imei].start = new Date(T);
      } else if (AD === 2 && droneFlyingTimes[imei].start) {
        // AD=2 is the end of the flight, calculate the difference
        const endTime = new Date(T);
        const flightDuration = (endTime - droneFlyingTimes[imei].start) / 1000 / 60 / 60; // Convert milliseconds to hours
        droneFlyingTimes[imei].hours += flightDuration;
        droneFlyingTimes[imei].start = null; // Reset the start time for the next flight
        totalFlyingHours += flightDuration;
      }
    });

    res.json({ totalFlyingHours });
 // } catch (error) {
   // console.error('Error fetching flying hours for user:', error);
   // res.status(500).json({ message: 'Internal server error' });
  //}
});
















app.get('/flying-hours/:imei', async (req, res) => {
  const { imei } = req.params;

  try {
    const todayDate = getTodayDate();

    // Fetch data for the specific drone from MongoDB for today's date
    const flights = await DroneTripData.aggregate([
      {
        '$match': {
          T: { '$regex': `^${todayDate}` }, // Match today's date
          AD: { '$in': [1, 2] }, // Match AD = 1 (start) and AD = 2 (end)
          t: {'$eq' :imei }// Match the specific drone IMEI
        }
      },
      {
        $sort: { T: 1 } // Sort by timestamp
      }
    ]);

    let totalFlyingHours = 0;

    // Calculate flying hours for the specific drone
    let start = null;
    flights.forEach((flight) => {
      const { AD, T } = flight;

      if (AD === 1) {
        // AD=1 is the start of the flight
        start = new Date(T);
      } else if (AD === 2 && start) {
        // AD=2 is the end of the flight, calculate the difference
        const endTime = new Date(T);
        const flightDuration = (endTime - start) / 1000 / 60 / 60; // Convert milliseconds to hours
        totalFlyingHours += flightDuration;
        start = null; // Reset the start time for the next flight
      }
    });

    res.json({ imei, totalFlyingHours });
  } catch (error) {
    console.error('Error fetching flying hours for drone:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});










// Define routes...
if(PROD==1){
  const sslOptions = {
    key: fs.readFileSync('/etc/letsencrypt/live/dashboard.fuselage.co.in/privkey.pem'),
      cert: fs.readFileSync('/etc/letsencrypt/live/dashboard.fuselage.co.in/cert.pem')
  };
  
  https.createServer(sslOptions, app).listen(API_PORT, () => {
    console.log(`HTTPS Server running on port ${API_PORT}`);
  });
  }else{
  app.listen(API_PORT, () => {
    console.log(`Server is running on port ${API_PORT}`);
  });
  }

export { app };

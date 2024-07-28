import express from 'express';
import mongoose from 'mongoose';
import { User } from './models/User.mjs';
import { Drone } from './models/Drone.mjs';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI;

// Connect to MongoDB
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true, authSource: 'admin' })
    .then(() => console.log({'message':'Connected to MongoDB'}))
    .catch(err => console.error('Could not connect to MongoDB', err));

const secret = 'Astrazeneca9763'; // Use a strong secret in production


app.post('/register', async (req, res) => {
    const { username, password, role,mobile,companyName } = req.body;
    console.log(username);
    if (!username || !password || !role) {
        return res.status(400).send({'message':'Username, password, and role are required'});
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username, password: hashedPassword, role,mobile,companyName });
        await user.save();
        res.status(201).send('User registered');
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
app.delete('/users/:username', async (req, res) => {
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
        console.log(token);
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
    const { imei, drone_name, model, status, range } = req.body;
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
        await drone.save();
        res.send('Drone updated');
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

app.get('/users/:username/drones', async (req, res) => {
    const { username } = req.params;

    try {
        // Find the user by username
        const user = await User.findOne({ username }).populate('drones'); // Populate the drones field

        if (!user) {
            return res.status(404).send({'message':'User not found'});
        }

        // Send the list of drones assigned to the user
        res.status(200).json(user.drones);
    } catch (err) {
        res.status(500).send({'message':'Server error ' + err.message});
    }
});

// Define routes...
const PORT = process.env.API_PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

export { app };

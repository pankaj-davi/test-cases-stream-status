require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());

// Load and parse the schemas JSON file
const schemasPath = path.join(__dirname, 'schemas.json');

let models = {};
let schemaDefinitions = {};

const createMongooseSchema = (jsonSchema) => {
  const mongooseSchema = {};
  for (const [key, value] of Object.entries(jsonSchema)) {
    if (typeof value === 'string') {
      mongooseSchema[key] = { type: mongoose.Schema.Types[value] };
    } else if (Array.isArray(value)) {
      mongooseSchema[key] = [{ type: mongoose.Schema.Types[value[0]] }];
    } else {
      mongooseSchema[key] = value;
    }
  }
  return new mongoose.Schema(mongooseSchema);
};

const loadSchemas = () => {
  const schemasJSON = JSON.parse(fs.readFileSync(schemasPath, 'utf8'));
  models = {};
  schemaDefinitions = schemasJSON;

  for (const [modelName, schemaDefinition] of Object.entries(schemasJSON)) {
    const mongooseSchema = createMongooseSchema(schemaDefinition);
    // Check if the model already exists before creating it
    models[modelName] = mongoose.models[modelName] || mongoose.model(modelName, mongooseSchema);
  }
  console.log('Schemas loaded');
};

// Initial schema loading
loadSchemas();

// Watch for changes in the schemas.json file
fs.watch(schemasPath, (eventType, filename) => {
  if (eventType === 'change') {
    console.log(`${filename} updated, reloading schemas...`);
    loadSchemas();
  }
});

app.get('/pankaj', (req, res) => {
  res.send('HelloLastChanges');
});

mongoose.connect(process.env.MONGOURI, {
  serverSelectionTimeoutMS: 30000,
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => {
  console.error('Error connecting to MongoDB:', err);
});

io.on('connection', (socket) => {
  console.log('New client connected');

  // Function to send test cases and schema
  const sendTestCases = async () => {
    try {
      const testCases = await models.TestCase.find(); // Adjust model name as needed
      socket.emit('FromAPI', {
        testCases,
        schema: schemaDefinitions.TestCase // Adjust model name as needed
      });
    } catch (error) {
      console.error('Error sending test cases:', error);
    }
  };

  // Send initial data to new clients
  sendTestCases();

  // Set up a change stream to listen for updates on the TestCase model
  const changeStream = models.TestCase.watch();

  changeStream.on('change', (change) => {
    console.log('Change detected:', change);
    sendTestCases(); // Send updated data to clients
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
    changeStream.close(); // Clean up the change stream on disconnect
  });
});

server.listen(8080, () => console.log(`Server running on port ${8080}`));

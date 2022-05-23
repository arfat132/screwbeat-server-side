const express = require('express')
const app = express()
const cors = require('cors')
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()

//middleware
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Screwbeat is running')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
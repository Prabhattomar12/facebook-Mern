import dotEnv from 'dotenv'

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bodyParser from 'body-parser';
import Grid from 'gridfs-stream';
import gridFsStroage from 'multer-gridfs-storage';
import multer from 'multer';
import path from 'path';
import db from './dbModel.js';
import Pusher from 'pusher';

// app configs
const app = express();
 dotEnv.config();
const PORT = process.env.PORT || 9000;
// middlewares
app.use(bodyParser.json());
app.use(cors());
const pusher = new Pusher({
  appId: '1212017',
  key: 'ef485cbaa8020ffd2847',
  secret: 'ef6d6cf91f0b7a27f800',
  cluster: 'ap2',
  useTLS: true,
});

// db configs
const mongoURI =process.env.MONGODB_URI;

const conn = mongoose.createConnection(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true,
});

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true,
});

mongoose.connection.once('open', () => {
  console.log('DB Connected');

  const changeStream = mongoose.connection.collection('posts').watch();
  changeStream.on('change', (change) => {
    console.log(change);

    if (change.operationType === 'insert') {
      pusher.trigger('posts', 'inserted', {
        change: change,
      });
    } else {
      console.log('error in triggering pusher');
    }
  });
});

let gfs;

conn.once('open', () => {
  console.log('DB Connected');

  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('images');
});

const storage = new gridFsStroage({
  url: mongoURI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      const filename = `image-${Date.now()}${path.extname(file.originalname)}`;

      const fileinfo = {
        filename: filename,
        bucketName: 'images',
      };

      resolve(fileinfo);
    });
  },
});

const upload = multer({ storage });

// routes
app.get('/', (req, res) => res.status(200).json({ message: 'Hello world' }));

app.post('/upload/image', upload.single('file'), (req, res) => {
  res.status(201).send(req.file);
});

app.get('/retrieve/image/single', (req, res) => {
  gfs.files.findOne({ filename: req.query.name }, (err, file) => {
    //  console.log('file ', file)

    if (err) {
      res.status(500).send(err);
    } else if (!file || file.length === 0) {
      res.status(404).json({ err: 'file not found' });
    } else {
      const readstream = gfs.createReadStream(file.filename);
      readstream.pipe(res);
    }
  });
});

app.get('/retrieve/posts', (req, res) => {
  db.find((err, data) => {
    if (err) {
      res.status(500).send(err);
    } else {
      data.sort((b, a) => {
        return a.timestamp - b.timestamp;
      });

      res.status(200).send(data);
    }
  });
});

app.post('/upload/post', (req, res) => {
  const post = req.body;
  console.log(req.body);
  db.create(post, (err, data) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.status(201).send(data);
    }
  });
});

// listener

app.listen(PORT, () => console.log(`Server is running at port ${PORT}`));

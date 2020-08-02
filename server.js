const express = require("express");
const path = require("path");
const crypto = require("crypto");
const mongoose = require("mongoose");
const multer = require("multer");
const GridFsStorage = require("multer-gridfs-storage");
const Grid = require("gridfs-stream");
const methodOverride = require("method-override");

const app = express();

//MiddleWare
app.use(express.json({ extended: false }));
app.use(methodOverride("_method"));

app.set("view engine", "ejs");

//MongoDb URI
mongo_URI =
  "mongodb+srv://<username>:<password>@fileuploadtodatabase.9lj5b.mongodb.net/<dbname>?retryWrites=true&w=majority";

//Create mongoDB connection
const conn = mongoose.createConnection(mongo_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

//Init the gfs

var gfs;

conn.once("open", () => {
  //Init the stream
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection("uploads");
});

//Create the storage engine
const storage = new GridFsStorage({
  url: mongo_URI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString("hex") + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: "uploads",
        };
        resolve(fileInfo);
      });
    });
  },
});
const upload = multer({ storage });

//GET '/'
//loads form
app.get("/", (req, res) => {
  gfs.files.find().toArray((err, files) => {
    // check if files exist
    if (!files || files.length === 0) {
      return res.render("index", { files: false });
    } else {
      files.map((file) => {
        if (
          file.contentType === "image/jpeg" ||
          file.contentType === "image/png"
        ) {
          file.isImage = true;
        } else {
          file.isImage = false;
        }
      });
      console.log("I am getting");
      //   res.sender("index", { files: files });
      res.render("index", { files: files });
    }
  });
});

//POST /upload
//Uploads to DB
app.post("/upload", upload.single("file"), (req, res) => {
  // res.json({ file:req.file })
  res.redirect("/");
});

//Get /files
//Display all files in json
app.get("/files", (req, res) => {
  //   gfs = Grid(conn.db, mongoose.mongo);
  //   console.log(gfs.files);
  gfs.files.find().toArray((err, files) => {
    // check if files exist
    if (!files || files.length === 0) {
      return res.status(404).json({
        err: "No File exists",
      });
    }

    //Files exist
    return res.json(files);
  });
});

//Get /files/:filename
//Display file by filename
app.get("/files/:filename", (req, res) => {
  //   gfs = Grid(conn.db, mongoose.mongo);
  //   console.log(gfs.files);
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // check if files exist
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: "No File exists",
      });
    }

    //Files exist
    return res.json(file);
  });
});

//Get /image/:filename
//Display image by filename
app.get("/image/:filename", (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // check if files exist
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: "No File exists",
      });
    }
    //check if the image
    if (file.contentType === "image/jpeg" || file.contentType === "image/png") {
      //read the stream to the browser
      const readstream = gfs.createReadStream(file.filename);
      readstream.pipe(res);
    } else {
      res.status(404).json({
        err: "Not an Image",
      });
    }
  });
});

//@route DELETE
//@desc Delete an image by id
app.delete("/files/:id", (req, res) => {
  gfs.remove({ _id: req.params.id, root: "uploads" }, (err, gridStore) => {
    if (err)
      return res.status(404).json({
        err: err,
      });
    res.redirect("/");
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

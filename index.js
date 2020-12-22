const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const MongoClient = require('mongodb').MongoClient;
const fileUpload = require('express-fileupload');
const fs = require('fs-extra');
const ObjectId = require("mongodb").ObjectID;
const port = 5000;
require('dotenv').config();

const app = express();

app.use(bodyParser.json())

app.use(bodyParser.urlencoded({ extended: false }))
app.use(cors());

app.use(express.static('services'));
app.use(fileUpload());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vw2gd.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

client.connect(err => {
	const programCollections = client.db("volunteer").collection("programs");
	const registerVolunteerCollections = client.db("volunteer").collection("registerVolunteer");
	const adminCollection = client.db("volunteer").collection("admin");

	app.get('/programs', (req, res) => {
		const search = req.query.keyword;

		programCollections.find({ area: { $regex: search } })
			.toArray((err, document) => {
				console.log(document);
				res.send(document)
			})
	})



	app.post('/register', (req, res) => {
		const registerData = req.body.eventRegister;
		const { email, title } = registerData;

		registerVolunteerCollections.find({ email: email, title: title })
			.toArray((err, document) => {
				if (document.length > 0) {
					res.send('false')
				} else {
					registerVolunteerCollections.insertOne(registerData)
						.then(result => {
							res.send(result.insertedCount > 0)
						})
				}
			})
	});

	app.get('/register/:email', (req, res) => {
		const email = req.params.email;
		adminCollection.find({ email: email })
			.toArray((err, documents) => {
				if (documents.length > 0) {
					registerVolunteerCollections.find({})
						.toArray((err, documents) => {
							res.send(documents)
						})
				} else {
					registerVolunteerCollections.find({ email: email })
						.toArray((err, documents) => {
							res.send(documents)
						})
				}
			})


	});


	// Volunter and admin delete registration
	app.delete("/deleteRegistration/:id", (req, res) => {
		const id = req.params.id;
		registerVolunteerCollections.deleteOne({ _id: ObjectId(id) })
			.then((result) => {
				res.send(result);
			});
	});

	// admin change registration status
	app.patch("/changeStatus", (req, res) => {
		const changeStatus = req.body.changeStatus;

		registerVolunteerCollections.updateOne(
			{ _id: ObjectId(changeStatus.id) },
			{
				$set: {
					status: changeStatus.status
				}
			})
			.then((result) => {
				res.send(result);
			});
	});


	app.get('/isAdmin/:email', (req, res) => {
		const email = req.params.email;
		adminCollection.find({ email: email })
			.toArray((err, documents) => {
				res.send(documents);
			})
	})

	app.post('/makeAdmin', (req, res) => {
		const adminEmail = req.body.adminEmail;
		const { email } = adminEmail;

		adminCollection.find({ email: email })
			.toArray((err, document) => {
				if (document.length > 0) {
					res.send('false')
				} else {
					adminCollection.insertOne(adminEmail)
						.then(result => {
							res.send(result.insertedCount > 0)
						})
				}
			})
	})

	app.post('/addProgram', (req, res) => {
		const file = req.files.file;
		const name = req.body.name;
		const title = req.body.title;
		const description = req.body.description;
		const area = req.body.area;

		const filePath = `${__dirname}/programs/${file.name}`;
		file.mv(filePath, err => {
			if (err) {
				return res.status(500).send({ msg: "Failed to upload img" })
			}
			res.send({ name: file.name, path: `/${file.name}` });

			const newImg = fs.readFileSync(filePath);
			const encImg = newImg.toString('base64');

			const image = {
				contentType: file.mimetype,
				size: file.size,
				img: Buffer.from(encImg, 'base64')
			};

			programCollections.insertOne({ name, title, description, area, image })
				.then(result => {
					res.send(result.insertedCount > 0)
				});
		})

	});


	app.get('/', (req, res) => {
		res.send('Hello volunteer programs')
	})

	app.listen(process.env.PORT || port)

});

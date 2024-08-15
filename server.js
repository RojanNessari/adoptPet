const express = require('express');
const path = require("path");
const fs = require('fs');
const session = require('express-session');
const app = express();
const port = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true
}));

const loginFilePath = path.join(__dirname, 'login.txt');
const petFilePath = path.join(__dirname, 'pets.txt');

// Middleware to ensure user is authenticated
function ensureAuthenticated(req, res, next) {
    if (req.session.user) {
        return next(); // User is authenticated, proceed
    } else {
        res.redirect('/login'); // User is not authenticated, redirect to login page
    }
}

// Store redirect path
app.use((req, res, next) => {
    if (!req.session.user && req.path !== '/login') {
        req.session.redirectTo = req.path;
    }
    next();
});

// Function to validate username and password format
function validateUsernamePass(username, password) {
    const usernameRegex = /^[a-zA-Z0-9]+$/;
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{4,}$/;
    return usernameRegex.test(username) && passwordRegex.test(password);
}

// Function to register a new user
function registerUser(username, password, callback) {
    if (!validateUsernamePass(username, password)) {
        return callback('Invalid username or password format.');
    }

    fs.readFile(loginFilePath, 'utf8', (err, data) => {
        if (err) return callback('Error reading login file.');

        const users = data.split('\n').filter(line => line.trim() !== '');
        const userExists = users.some(user => user.split(':')[0] === username);

        if (userExists) {
            return callback('Username already exists.');
        }

        const newUser = `${username}:${password}\n`;
        fs.appendFile(loginFilePath, newUser, (err) => {
            if (err) return callback('Error writing to login file.');

            callback(null, 'Account successfully created.');
        });
    });
}

// Function to generate a unique ID for pets
function generatePetId() {
    if (!fs.existsSync(petFilePath)) {
        return 1; // If the file doesn't exist, start with ID 1
    }
    const data = fs.readFileSync(petFilePath, 'utf8');
    const lines = data.trim().split('\n');
    const lastLine = lines[lines.length - 1];
    if (lastLine) {
        const lastId = parseInt(lastLine.split(':')[0]);
        return lastId + 1;
    } else {
        return 1;
    }
}

// Route Handlers

// Homepage route
app.get("/", (req, res) => {
    res.render('homepage', { user: req.session.user });
});

// Other static pages
app.get('/browseAvailablePet', (req, res) => {
    res.render('browseAvailablePet', { user: req.session.user });
});

app.get('/catCare', (req, res) => {
    res.render('catCare', { user: req.session.user });
});

app.get('/dogCare', (req, res) => {
    res.render('dogCare', { user: req.session.user });
});

app.get('/contactUs', (req, res) => {
    res.render('contactUs', { user: req.session.user });
});

// Find Dog/Cat route with initial empty pets array
app.get('/findDogCat', (req, res) => {
    res.render('findDogCat', { pets: [], user: req.session.user });
});

// Registration routes
app.get('/register', (req, res) => {
    res.render('registerAccount', { user: req.session.user });
});
app.get('/privacy',(req,res)=>{
    res.render('privacy', { errorMessage: '', user: req.session.user });
})

app.post('/register', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.send(`<p>Username and password are required.</p><a href="/register">Try again</a>`);
    }

    registerUser(username, password, (err, message) => {
        if (err) {
            return res.send(`<p>${err}</p><a href="/register">Try again</a>`);
        }
        res.send(`<p>${message}</p><a href="/">Go to homepage</a>`);
    });
});

// Login routes
app.get('/login', (req, res) => {
    res.render('login', { errorMessage: '', user: req.session.user });
});


app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.render('login', { errorMessage: "Username and password are required.", user: req.session.user });
    }

    fs.readFile(loginFilePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).send('Error reading login file.');
        }

        const users = data.split('\n').filter(line => line.trim() !== '');
        const validUser = users.some(user => {
            const [storedUsername, storedPassword] = user.split(':');
            return storedUsername === username && storedPassword === password;
        });

        if (validUser) {
            req.session.user = username;
            const redirectTo = req.session.redirectTo || '/';
            delete req.session.redirectTo;
            res.redirect(redirectTo);
        } else {
            res.render('login', { errorMessage: "Invalid username or password, please try again.", user: req.session.user });
        }
    });
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Logout failed.');
        }
        res.redirect('/');
    });
});

// GiveAway route, protected with authentication middleware
app.get('/giveAway', ensureAuthenticated, (req, res) => {
    res.render('giveAway', { user: req.session.user });
});

// Handle pet registration when a user gives away a pet
app.post('/giveAway', ensureAuthenticated, (req, res) => {
    const {
        petType, breed, age, gender, otherDogs,
        otherCats, smallChildren, comments, ownerName, ownerEmail
    } = req.body;

    // Validate form data
    if (!petType || !breed || !age || !gender || !ownerName || !ownerEmail) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    const petId = generatePetId();
    const petData = `${petId}:${req.session.user}:${petType}:${breed}:${age}:${gender}:${otherDogs}:${otherCats}:${smallChildren}:${comments}:${ownerName}:${ownerEmail}\n`;

    fs.appendFile(petFilePath, petData, (err) => {
        if (err) {
            console.error('Error saving pet data:', err);
            return res.status(500).json({ error: 'Error saving pet data.' });
        }
        res.json({ message: 'Pet registered successfully!' });
    });
});

// Find Pets route to handle search and display results
app.post('/findPets', (req, res) => {
    const { petType, breed, age, gender, otherDog } = req.body;

    // Read the pets data file
    fs.readFile(petFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading pets file:', err);
            return res.status(500).send('Error reading pets file.');
        }

        // Split the data into lines and map them into objects
        const pets = data.split('\n').filter(line => line.trim() !== '').map(line => {
            const [id, owner, type, petBreed, petAge, petGender, petOtherDog, petOtherCat, petSmallChildren, otherInfo] = line.split(':');
            const imagePath = `/photo/${petBreed.replace(/\s+/g, '-')}.jpg`; // Replaces spaces with dashes for file name
            return {
                id,
                owner,
                type: type.toLowerCase(),
                breed: petBreed.toLowerCase(),
                age: petAge.toLowerCase(),
                gender: petGender.toLowerCase(),
                otherDog: petOtherDog.toLowerCase(),
                otherInfo,
                imagePath
            };
        });

        // Filter pets based on user input
        const filteredPets = pets.filter(pet => {
            const matchesType = petType ? petType.toLowerCase() === pet.type : true;
            const matchesBreed = breed && breed.toLowerCase() !== 'nomatter' ? breed.toLowerCase() === pet.breed : true;
            const matchesAge = age && age.toLowerCase() !== 'nomatter' ? age.toLowerCase() === pet.age : true;
            const matchesGender = gender && gender.toLowerCase() !== 'any gender' ? gender.toLowerCase() === pet.gender : true;
            const matchesOtherDog = otherDog && otherDog.toLowerCase() !== 'nomatter' ? otherDog.toLowerCase() === pet.otherDog : true;

            return matchesType && matchesBreed && matchesAge && matchesGender && matchesOtherDog;
        });

        // Render the findDogCat page with the filtered pets
        res.render('findDogCat', { pets: filteredPets, user: req.session.user });
    });
});

// Static files
app.use(express.static('public'));

// Start the server
app.listen(port, () => {
    console.log(`The server is running on http://localhost:${port}`);
});

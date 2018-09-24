const _ = require('lodash');
const {ObjectID} = require('mongodb');
const express = require('express');
const bodyParser = require('body-parser');
const {mongoose} = require('./db/mongoose');
const {Todo} = require('./models/todo');
const {User} = require('./models/user');
const {authenticate} = require('./middleware/authenticate');
const cors = require('cors');

let app = express();

app.use(cors());
app.use(bodyParser.json());

let port = process.env.PORT || 3000;

app.post('/todos',authenticate, (req,res) => {
    
    var todo = new Todo({
        text: req.body.text,
        _creator: req.user._id
    });
    
    todo.save().then((todo) => {
        res.send({todo})
    }, (e) => {
        res.status(400).send(e);
    })
});

app.get('/todos',authenticate, (req,res) => {
    Todo.find({
        _creator: req.user._id
    }).then((todos) => {
        res.send({todos});
    }, (e) => {
        res.status(400).send(e);
    });
});

app.get('/todos/:id',authenticate, (req,res) => {
    const id = req.params.id;
    if(!ObjectID.isValid(id)){
        return res.status(404).send()
    }
    
    Todo.findOne({
        _creator: req.user._id,
        _id: id
        
    }).then((todo) => {
        if(!todo){
            return res.status(404).send();
        }
        res.send({todo});
    },(e) => {
        res.status(400).send(e);
    })
})

app.delete('/todos/:id',authenticate, (req,res) => {
    const id = req.params.id;
    if(!ObjectID.isValid(id)){
        return res.status(404).send();
    }
    
    Todo.findOneAndRemove({
        _id: id,
        _creator: req.user._id
    }).then((todo) => {
        if(!todo){
            return res.status(404).send();
        }
        res.send({todo});
    },(e) => {
        res.status(400).send();
    });
});

app.patch('/todos/:id',authenticate,(req,res) => {
    const id = req.params.id;
    if(!ObjectID.isValid(id)) {
        return res.status(404).send();
    }
    var body = _.pick(req.body,['text','completed']);
    
    if(_.isBoolean(body.completed) && body.completed) {
        body.completedAt = new Date().getTime();
    }else{
        body.completed = false;
        body.completedAt = null;
    }
    
    Todo.findOneAndUpdate({_id: id,_creator: req.user._id},{$set: body},{new: true}).then((todo) => {
        if(!todo){
            return res.status(404).send();
        }
        
        res.send({todo});
    }).catch((e) => {
        res.status(400).send();
    })
})


app.post('/users',(req,res) => {
    let body = _.pick(req.body,['email','password']);
    let user = new User(body);
    user.save().then((user) => {
        return user.generateAuthToken();
    }).then((token) => {
        res.header('x-auth',token).send({user});
    }).catch((e) => {
        res.status(400).send(e);
    })
});

app.post('/users/login',(req,res) => {
    var user;
    var body = _.pick(req.body,['email','password']);
    User.findByCredentials(body.email,body.password).then((loginUser) => {
        user = loginUser;
        return user.generateAuthToken();
    }).then((token) => {
        res.header('x-auth',token).send(user);
    }).catch((e) => {
        res.status(400).send();
    })
})


app.get('/users/me',authenticate, (req,res) => {
    res.send({user: req.user});
})

app.delete('/users/me/token',authenticate,(req,res) => {
    req.user.removeToken(req.token).then(() => {
        res.status(200).send();
    },() => {
        res.status(400).send()
    })
});

app.listen(port, () => {
    console.log(`Server is up on ${port}` );
});
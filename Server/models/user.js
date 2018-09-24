const _ = require('lodash');
const mongoose = require('mongoose');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        minlength: 1,
        trim: true,
        unique: true,
        validate: {
            validator: validator.isEmail,
            message: '{VALUE} is not a valid email'
        }
    },
    
    password: {
        type: String,
        required: true,
        minlength: 6,
    },
    
    tokens: [{
        access: {
            type: String,
            required: true
        },
        token: {
            type: String,
            required: true
        }
    }]
});

UserSchema.methods.toJSON = function() {
    let user = this;
    let userObject = user.toObject();
    
    return _.pick(userObject,['_id','email']);
};

UserSchema.methods.generateAuthToken = function() {
    let user = this;
    let access = 'auth';
    let token = jwt.sign({_id: user._id.toHexString(),access},'hjdgjggvhFdhvdwjhdvqkaxba').toString();
    user.tokens.push({access,token});
    return user.save().then(() => {
        return token;
    });
};

UserSchema.methods.removeToken = function(token) {
    var user = this;
    return user.update({
        $pull: {
            tokens: {token}
        }
    });
}


UserSchema.statics.findByCredentials = function(email,password) {
    var User = this;
    return User.findOne({email}).then((user) => {
        if (!user){
            return Promise.reject();
        }
        return new Promise((resolve,reject) => {
            bcrypt.compare(password,user.password,(err,res) => {
                if (res){
                    resolve(user);
                }else{
                    reject();
                }
            })
        })
    }).catch((e) => {
        return Promise.reject();
    })
}

UserSchema.statics.findByToken = function(token) {
    let User = this;
    let decoded;
    try{
        decoded = jwt.verify(token,'hjdgjggvhFdhvdwjhdvqkaxba');
    }catch(e){
        return Promise.reject()
    }
    return User.findOne({
        '_id': decoded._id,
        'tokens.token': token,
        'tokens.access': 'auth'
    });
}

UserSchema.pre('save',function(next) {
    var user = this;
    if (user.isModified('password')) {
        bcrypt.genSalt(10,(err,salt) => {
            bcrypt.hash(user.password,salt,(err,hash) => {
                user.password = hash;
                next();
            });
        });
    }else{
        next();
    }
})

const User = mongoose.model('User',UserSchema);

module.exports = {User};



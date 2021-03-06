'use strict';
const router = require('express').Router();
const mongoose = require('mongoose');
const Auth = require('../../utils/auth.middleware');
const Stack = mongoose.model('Stack');
const Test = mongoose.model('Test');

module.exports = router;

router.get('/:stackId', Auth.assertAuthenticated, function(req,res,next) {
    Stack.findById(req.params.stackId)
    .populate('tests')
    .then(function(stack){
        res.json(stack);
    })
    .catch(next);
});

router.post('/', Auth.assertAuthenticated, function(req,res,next) {
    var newStack; 
    Stack.create(req.body)
    .then(stack => Stack.findById(stack._id).populate('tests'))
    .then(function(populatedStack) {
        populatedStack.associateTests();
        newStack = populatedStack;
    })
    .then(populatedStack => res.json(newStack))
    .catch(next);
});

router.put('/:stackId', Auth.assertAuthenticated, function(req,res,next) {
    Stack.findById(req.params.stackId)
    .then(function(stack){
        stack.set(req.body);
        return stack.save();
    })
    .then(stack => Stack.findById(stack._id).populate('tests'))
    .then(populatedStack => res.json(populatedStack))
    .catch(next);
});

router.get('/', Auth.assertAuthenticated, function(req, res, next) {
    let queryObj = {};
    if (req.query.userId) queryObj = {user: req.query.userId};
    Stack.find(queryObj)
    .populate('tests')
    .then(stacks => res.json(stacks))
    .catch(next);
});

router.delete('/:stackId', Auth.assertAuthenticated, function(req, res, next) {
    var stackId = req.params.stackId;
    Stack.findById(stackId)
    .then(stack => stack.deleteTests())
    .then(() => Stack.findByIdAndRemove(stackId))
    .then(removedStack => res.json(stackId))
    .catch(next);
});
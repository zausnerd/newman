'use strict';
const router = require('express').Router();
const mongoose = require('mongoose');
const Auth = require('../../utils/auth.middleware');
const Test = mongoose.model('Test');
const Result = mongoose.model('Result');

module.exports = router;

router.post('/', Auth.assertAuthenticated, function(req,res,next) {
    var result;
    var test;
    console.log(req.body,"*****");
    Result.create(req.body)
    .then(function(resultDocument) {
        result = resultDocument;
    })
    .then(function() {
        return Test.findById(req.body.test);
    })
    .then(function(testDocument) {
      test = testDocument;
      if (test.result) {
        return Result.findByIdAndRemove(test.result)
      }
    })
    .then(function() {
      test.result = result;
      console.log("TEST", test);
      res.send(test);
    })
    .catch(next);
});



router.get('/:resultId', Auth.assertAuthenticated, function(req,res,next) {
  Result.findById(req.params.resultId)
  .then(result => res.json(result))
  .catch(next);

});

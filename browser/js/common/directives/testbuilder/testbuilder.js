'use strict';

app.config(function ($stateProvider) {
    $stateProvider.state('testbuilder', {
        url: '/testbuilder',
        templateUrl: 'js/common/directives/testbuilder/newTest.html',
        controller: 'TestbuilderCtrl'
    });
});

app.directive('testbuilder', function(){
  return {
    restrict: 'E',
    templateUrl: 'js/common/directives/testbuilder/testbuilder.html'
  };
});

app.factory('TestFactory', function($http, $log, TestBuilderFactory) {

    let ResponsePool = function() {};

    ResponsePool.prototype.getValue = function(key) { //test1.data.userId
        let currentTestName = this.currentTestName;
        let keys = key.split('.'); //['test1', 'data', 'objectId']
        return keys.reduce(function (currentKey, nextKey) { //responsePool[test1] > test1[data] > data[userId]

            try {
                return currentKey[nextKey];
            }
            catch(error) {
                alert('Whoops! Newman couldn\'t interpolate "' + key + '" while running "' + currentTestName + '". Make sure you\'re interpolating the right value, and try to run the entire stack from the home page.');
            }

        }, responsePool);
    };

    let responsePool = new ResponsePool();

    let interpolate = function(input) {

        if (typeof input === 'string') { //'http://mysite.com/users/{{test1.data.userId}}/posts/{{test2.data.postId}}'
            if (input.indexOf('{{') === -1) return input;
            let newVals = [];

            input.split("}}")
            .forEach(function(elem) {
                if (elem.indexOf("{{") !== -1) {
                    let slicePoint = elem.indexOf("{{");
                    let sliced = elem.slice(slicePoint);
                    newVals.push(elem.replace(sliced, responsePool.getValue(sliced.substring(2))));
                } else newVals.push(elem);
            });

            return newVals.join(''); //'http://mysite.com/users/123/posts/456'
        }

        else if (Array.isArray(input)) {
            return input.map(interpolate);
        }

        else if (typeof input === 'object') {
            for (let key in input) {
                input[key] = interpolate(input[key]);
            }
            return input;
        }

        else return input;
    };

    let makeRequest = function(test) {

        let requestObj = {};

        requestObj.method = test.method;
        requestObj.url = test.url;

        if (test.headers.length) {
            requestObj.headers = {};
            test.headers.forEach(header => {
                if (header !== null) requestObj.headers[header.key] = requestObj.headers[header.value];
            });
        }
        let testData;
        if (typeof test.body.data === 'string') test.body.data = JSON.parse(test.body.data);
        testData = test.body.data;

        if (test.body.bodytype === 'raw') {
            requestObj.data = testData.reduce(function(dataObj, nextBodyPair) {
                dataObj[nextBodyPair.key] = nextBodyPair.value;
                return dataObj;
            }, {});
        }

        if (test.body.bodytype === 'x-www-form-urlencoded') {
            requestObj.data = testData.reduce(function(dataArr, nextBodyPair) {
                dataArr.push(nextBodyPair.key + '=' + nextBodyPair.value);
                return dataArr;
            },[]).join('&');
            requestObj.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        }
        let formData;
        if (test.body.bodytype === 'form-data') {
            formData = new FormData();
            testData.forEach(keyValuePair => formData.set(keyValuePair.key, keyValuePair.value));
            requestObj.headers['Content-Type'] = undefined;
        }

        try {

            if (test.body.bodytype === 'form-data') {
                return $http[requestObj.method.toLowerCase()](requestObj.url, formData, {
                    transformRequest: angular.identity,
                    headers: requestObj.headers
                })
                .then(response => response.data);
            } else {
                return $http(requestObj)
                .then(response => response.data);
            }
        }
        catch(error) {
            alert('Whoops! During ' + responsePool.currentTestName + ', you asked Newman to send a request to ' + requestObj.url + 'but that doesn\'t appear to be a valid address.');
        }
    };


    return {
        runTest: function(test) {

            responsePool.currentTestName = test.name;

            let copyOfTest = _.cloneDeep(test);

            let interpolatedTest = interpolate(copyOfTest);

            //Construct and send the $http request
            return makeRequest(interpolatedTest)
            .catch(err => {
                if (err.config.url) alert('Whoops! During ' + test.name + ', we tried to test ' + err.config.url + ' but it looks like this isn\'t a valid address.');
            });
        },
        saveResults: function(results, test) {

            results.test = test._id;

            return TestBuilderFactory.edit(test)
            .then(() => $http.post('/api/results', results))
            .then(res => res.data)
            .catch($log.error);
        },
        getPreviousResults: function(test) {
            if (!test.result) { return false; }
            return $http.get('/api/results/' + test.result)
            .then(res => res.data);
        },
        addToResponsePool: function(data) {
            responsePool[data.name] = data.response;
        },
        clearResponsePool: function() {
            responsePool = new ResponsePool();
        },
        getStackTests: function(viewedTest) {
            if (!viewedTest.stack) return Promise.resolve([]);
            return $http.get('/api/stacks/' + viewedTest.stack)
            .then(res => res.data.tests)
            .then(tests => {
                let includeTest = true; //Will include only tests that precede the viewedTest in the stack
                return tests.filter(test => {
                    if (test._id === viewedTest._id) includeTest = false;
                    return includeTest;
                });
            });
        }
    };
});

app.controller('TestbuilderCtrl', function($scope, $state, TestBuilderFactory, $rootScope, $log, AuthService, TestFactory, $mdDialog, $mdMedia){

  $scope.toggle = false;
  $scope.setToggle = function(){
    $scope.toggle = !$scope.toggle;
    $scope.$evalAsync();
    };


    $scope.test = {};
	$scope.test.name = 'newTest';
    AuthService.getLoggedInUser()
    .then(function(user){
    	$scope.test.user = user;
    	$scope.test.userId = user._id;
    })
    .catch($log.error);

	$scope.test.url = 'http://';
	$scope.test.params = [];
	$scope.test.headers = [];
	$scope.test.body = {};
	$scope.test.body.data = [];
    $scope.test.validators = [];
	$scope.test.method = "GET";
	$scope.showParams = false;
	$scope.showHeaders = false;
	$scope.showBody = false;
    $scope.showValidators = false;
    $scope.isNewTest = true;
	$scope.addForm = function(index, type){
        console.log("")
        console.log(index, type, "***");
        console.log($scope.test[type].length, "length");
        if (type !== 'body' && (index === $scope.test[type].length - 1 || $scope.test[type].length === 0) ) {
            console.log("HIT THE FIRST IF");
            if (type === "params") $scope.test.params.push({});
            if (type === "headers") $scope.test.headers.push({});
            if (type === "validators") $scope.test.validators.push({name: 'validator' + (Number($scope.test.validators.length) + 1).toString(), func: "(function(response) {\n\n});"});
        }
        else if (index === $scope.test[type].data.length - 1 || $scope.test[type].data.length === 0) {
            console.log("HITTING THE ELSE")
            $scope.test.body.data.push({});
        }
    $scope.$evalAsync();
};

	$scope.showForm = function(){
		if ($scope.test.params.length === 0) {
			$scope.addForm(0,"params");
			// $scope.numParams++;
		}
		$scope.showParams = !$scope.showParams;
	};

	$scope.displayHeaders = function(){
		if ($scope.test.headers.length === 0) {
			$scope.addForm(0,"headers");
			// $scope.numHeaders++;
		}
		$scope.showHeaders = !$scope.showHeaders;
	};

	$scope.displayBody = function(){
        if ($scope.test.body.data.length === 0) {
			$scope.addForm(0,"body");
			// $scope.numBodyObj++;
		}
		$scope.showBody = !$scope.showBody;
	};

    $scope.displayValidators = function(){
        if ($scope.test.validators.length === 0) {
            $scope.addForm(0,"validators");
        }
        $scope.showValidators = !$scope.showValidators;
    };

	$scope.composeURL = function() {
		var indexQuestionMark = $scope.test.url.indexOf('?');
		if (indexQuestionMark !== -1) {
			$scope.test.url = $scope.test.url.substring(0,indexQuestionMark);
		}
		$scope.test.url += '?';
		var finalString = '';
		for(var i = 0; i < $scope.test.params.length - 1; i++) {
			finalString = finalString + $scope.test.params[i].key + '=' + $scope.test.params[i].value + '&';
		}
		$scope.test.url  = $scope.test.url + finalString;
		$scope.test.url = $scope.test.url.slice(0,$scope.test.url.length - 1);
	};

    $scope.intermediary = function(){
        $scope.setToggle();
        window.setTimeout($scope.saveTest, 800);
    };

	$scope.saveTest = function(){
		//$scope.test.url = $scope.test.url;
		$scope.test.created = true;
        // var currentDate = new Date();
        // var time = currentDate.getHours() + ":" + currentDate.getMinutes() + ":" + currentDate.getSeconds()
        // console.log("before TestBuilderFactory.create", time);
		TestBuilderFactory.create($scope.test)
        .then(() =>  {
            // currentDate = new Date();
            // time = currentDate.getHours() + ":" + currentDate.getMinutes() + ":" + currentDate.getSeconds();
            // console.log("going to new state", time);
            $state.go('allTests')
        })
        .catch($log.error);
	};

$scope.runTest = function() {
        let funcArray = [];
        let cancelTest = false;
        $scope.results = {
            validatorResults: [],
            lastRun: Date.now()
        };
        $scope.test.validators.forEach(function (elem) {
            try {
                if (elem.func.length > 26) {
                    funcArray.push(eval(elem.func));
                }
            }
            catch(err) {
                alert('There was an error parsing the ' + elem.name + ' validator function. Refactor that function and try again.');
                cancelTest = true;
            }

        });
        if (cancelTest) return;
        TestFactory.runTest($scope.test)
        .then(function(resData) {
            $scope.test.response = JSON.stringify(resData);
            for (var i = 0; i < funcArray.length; i++) {
                try {
                    $scope.results.validatorResults.push(!!funcArray[i](resData));
                }
                catch (err){
                    alert('The following error occured while running the ' + $scope.test.validators[i].name + ' validator function: ' + err.message + '. Refactor that function and try again.');
                    return;
                }
            }
            if ($scope.results.validatorResults.length) $scope.results.finalResult = $scope.results.validatorResults.every(validatorResult => validatorResult);
        })
        .then($scope.showResults);
    };


     $scope.showResults = function(ev) {
        $mdDialog.test = $scope.test;
        $mdDialog.results = $scope.results;
        var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'))  && $scope.customFullscreen;
        $mdDialog.show({
            controller: DialogController,
            templateUrl: 'js/common/directives/testbuilder/testResults.html',
            parent: angular.element(document.body),
            targetEvent: ev,
            clickOutsideToClose:true,
            fullscreen: useFullScreen
        });
    };

 function DialogController($scope, $mdDialog) {
        $scope.test = $mdDialog.test;
        $scope.results = $mdDialog.results;
        $scope.hide = function() {
            $mdDialog.hide();
        };
        $scope.cancel = function() {
            $mdDialog.cancel();
        };
        $scope.answer = function(answer) {
            $mdDialog.hide(answer);
        };
    }
});

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

app.factory('TestFactory', function($http, $log) {

    let parseResponse = function(response) {};

    let makeRequest = function(test) {

        console.log('makeRequest is making a request with this test:', test);

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
        if (typeof test.body.data === 'string') testData = JSON.parse(test.body.data);
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
    };


    return {
        runTest: function(test) {
            //Construct and send the $http request
            return makeRequest(test)
            .catch($log.error);
            //Parsing the response
        },
        saveResults: function(results, test_id) {
            results.test = test_id;
            console.log("RESULTS", results);
            return $http.post('/api/results',results)
            .then(res => res.data);
        }
    };
});

app.controller('TestbuilderCtrl', function($scope, $state, TestBuilderFactory, $rootScope, $log, AuthService, TestFactory, $mdDialog, $mdMedia){
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
	$scope.numParams = 0;
	$scope.numHeaders = 0;
	$scope.numBodyObj = 0;
	$scope.addForm = function(index, type){
		if (type === 'validator') $scope.test.validators.push({name: $scope.test.name + (Number($scope.test.validators.length) + 1).toString(), func: "function(response) {\n\n}"});
        else if (index === $scope.test[type].length - 1 || $scope.test[type].length === 0 || index === $scope.test[type].data.length - 1 || $scope.test[type].data.length === 0) {
			if (type === "params") {
				$scope.numParams++;
				$scope.test.params.push({});
			}
			else if (type === "headers") {
				$scope.numHeaders++;
				$scope.test.headers.push({});
			}
			else if (type === "body") {
        $scope.numBodyObj++;
				$scope.test.body.data.push({});
			}
		}
		$scope.$evalAsync();
	};

	$scope.showForm = function(){
		if ($scope.test.params.length === 0) {
			$scope.addForm(0,"params");
			$scope.numParams++;
		}
		$scope.showParams = !$scope.showParams;
	};

	$scope.displayHeaders = function(){
		if ($scope.test.headers.length === 0) {
			$scope.addForm(0,"headers");
			$scope.numHeaders++;
		}
		$scope.showHeaders = !$scope.showHeaders;
	};

	$scope.displayBody = function(){
        if ($scope.test.body.data.length === 0) {
			$scope.addForm(0,"body");
			$scope.numBodyObj++;
		}
		$scope.showBody = !$scope.showBody;
	};

    $scope.displayValidators = function(){
        if ($scope.test.validators.length === 0) {
            $scope.addForm(0,"validator");
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

	$scope.saveTest = function(){
		$scope.test.url = $scope.test.url;
		TestBuilderFactory.create($scope.test)
        .then(() => $state.go('allTests'))
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
                if (elem.func.length > 23) {
                    funcArray.push(eval('(' + elem.func + ')'));
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
            for (var i = 0; i < funcArray.length; i++) {
                console.log(i + " TH TEST BEING PUSHED YO");
                try {
                    $scope.results.validatorResults.push(!!funcArray[i](resData));
                }
                catch (err){
                    alert('The following error occured while running the ' + $scope.test.validators[i].name + ' validator function: ' + err.message + '. Refactor that function and try again.');
                    return;
                }
            }
            console.log('VALIDATOR RESULTS', $scope.results.validatorResults);
            $scope.results.finalResult = $scope.results.validatorResults.every(validatorResult => validatorResult);
            console.log("FINAL RESULT", $scope.results.finalResult);
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

    $scope.viewPreviousResults  = function() {


        //view previous results
    }

 function DialogController($scope, $mdDialog) {
        $scope.test = $mdDialog.test;
        $scope.results = $mdDialog.results;
        console.log('$scope.test:', $scope.test);
        console.log('$scope.results', $scope.results);
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

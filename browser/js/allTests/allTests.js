app.config(function ($stateProvider) {
    $stateProvider.state('allTests', {
        url: '/home/allTests',
        templateUrl: 'js/allTests/allTests.html',
        controller: 'allTestsCtrl',
        resolve: {
            allTests: function($http, $stateParams, AuthService) {
                return AuthService.getLoggedInUser()
                .then(function(user) {
                    console.log(user,'***USER""');
                    return $http.get('/api/tests?userId=' + user._id);
                })
                //.then(user => $http.get('/api/tests?userId=' + user._id))
                .then(function(response) {
                    console.log(response);
                });
            }
        }
    });
});


app.controller('allTestsCtrl',function($scope, allTests) {
    $scope.allTests = allTests;
    console.log($scope.allTests);

});
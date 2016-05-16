app.factory('TestBuilderFactory', function($http){
	var testobj = {};
	testobj.create = function(obj){
        if(obj._id) delete obj._id;
        obj.body.data = JSON.stringify(obj.body.data);
		return $http.post('/api/tests/', obj)
		.then(response => response.data);
	};
    testobj.edit = function(obj){
        obj.body.data = JSON.stringify(obj.body.data);
        return $http.put('/api/tests/' + obj._id, obj)
        .then(response => response.data);
    };
    testobj.delete = function(obj){
        return $http.delete('/api/tests/' + obj._id, obj);
    };
	return testobj;
});

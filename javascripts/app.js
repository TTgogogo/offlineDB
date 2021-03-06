
var app = angular.module('app', ['ui.bootstrap']);
app.controller('AppCtrl', function($scope, $modal, $timeout, indexDBService) {
    $scope.message = {};
    $scope.flags = {};
    $scope.flags.showRemoveIcon = false;      //remove icons are hidden by default to protect data from being removed by random clicks
    $scope.flags.title = "Offline DB demo";
    $scope.pageSize = 20;

    $scope.date = {};
    $scope.cost = {};
    $scope.maxSize = 5;

    $scope.setDefaultFilter = function() {
        $scope.cost.startPrice = 0;         //endPrice will be set in init()
        $scope.cost.endPrice = 0;
        $scope.date.start = new Date();     //assign current date to initial start date, which is subject to further adjustment in init()
        $scope.date.end = new Date();
    };

    $scope.init = function() {
        window.scrollTo(0,0);
        $scope.flags.title="Loading slides......";
        $scope.flags.isViewLoading = true;
        $scope.slides = [];
        $scope.flags.sorted ={};            //clear sort flags
        $scope.setDefaultFilter();
        $scope.message.type = "";

        indexDBService.open(function(){
            indexDBService.getAllItems(function(row){
                $scope.slides.push(row);                       //get all the slides and put them in DOM
                if(parseInt(row.price) > $scope.cost.endPrice ){
                    $scope.cost.endPrice  = parseInt(row.price);
                }                                             //set max value of search item: end price
                var start = new Date();
                var currentDateString = row.date.replace(/-/g,'');
                start.setFullYear(parseInt(currentDateString.substring(0,4)), parseInt(currentDateString.substring(4,6)) -1, parseInt(currentDateString.substring(6)));
                if(start < $scope.date.start) {
                    $scope.date.start = start;                //set max value of search item: end date
                }
            },
            function(){
                $scope.flags.title = 'Offline DB demo';
                $scope.flags.isViewLoading = false;
                $scope.currentPage = 1;
                $scope.$apply();
            });
        });
    };
    $scope.toTop = function() {
        window.scrollTo(0,0);
    };

    $scope.toggleRemove = function(){
        $scope.flags.showRemoveIcon = ! $scope.flags.showRemoveIcon;
    };

    $scope.close = function () {
        $scope.shouldBeOpen = false;
    };

    $scope.datePickStart = function() {
        $timeout(function() {
            $scope.flags.isOpenStart = true;
        });
    };
    $scope.datePickEnd = function() {
        $timeout(function() {
            $scope.flags.isOpenEnd = true;
        });
    };

    $scope.newDatePick = function() {
        $timeout(function() {
            $scope.flags.newDateOpen = true;
        });
    };

    $scope.closeMessage = function() {
        $scope.message = {};
    };

    $scope.clearDB = function(){                           //clear all the slides in DB
        $scope.flags.title = "Clearing database......";
        $scope.flags.isViewLoading = true;
        indexDBService.getAllItems(function(slide){
            indexDBService.deleteRecord(slide.timeStamp, function(){
                console.log(slide);                        //do nothing but log each removed slide deleted successfully
            });
        },
        function(){
            window.scrollTo(0,0);
            $scope.slides = [];
            $scope.message.text = "The database is now empty!";
            $scope.message.type = "alert-info";
            $scope.flags.title = "Offline DB demo";
            $scope.flags.isViewLoading = false;
            $scope.$apply();
        });
    };

    $scope.sort = function (key) {             //sort slides according to the key clicked
        if($scope.flags.sorted[key]){
            $scope.slides.reverse();           //each time the thead clicked, reverse the sort order
        }
        else{
            $scope.flags.sorted ={};            //clear previous sort flags
            $scope.flags.sorted[key] = true;
            $scope.slides.sort(function(a, b) {
                var x = parseFloat(a[key].replace(/-/g,''));
                var y = parseFloat(b[key].replace(/-/g,''));
                return ((x > y) ? -1 : ((x < y) ? 1 : 0));
            });
        }
    };

    $scope.openSlide = function (slide) {
        $scope.record = slide;
        var modalInstance = $modal.open({       //pass the slide to  ShowSlideModalCtrl
            templateUrl: 'showSlide.html',
            controller: "ShowSlideModalCtrl",
            resolve: {
                slide: function () {
                    return $scope.record;
                }
            }
        });
    };

    $scope.addSlide = function() {
        var modalInstance = $modal.open({
            templateUrl: 'newSlide.html',
            controller: "NewSlideModalCtrl"
        });
        modalInstance.result.then(function(record) {      //record is returned object from NewSlideModalCtrl
            var day = parseInt(record.date.getDate());
            var month = parseInt(record.date.getMonth() + 1); //Months are zero based
            var year = parseInt(record.date.getFullYear());

            var newDate = ''+ year + '-';
            if(month < 10) {
                newDate += '0' +  month + '-';
            }
            else{
                newDate += '' + month + '-';
            }
            if(day < 10) {
                newDate += '0' +  day;
            }
            else{
                newDate += '' + day;
            }
            var slide = {
                "name" :  record.name,
                "text": record.text,
                "location": record.location,
                "imageAll": record.imageAll,
                "date": newDate,
                "price": ''+record.price,
                "timeStamp" : new Date().getTime()
            };                                              //create a slide object
            indexDBService.addRecord(slide, function(){     //save the slide
                $scope.init();
                $scope.$apply();
            });
        }, function () {
            console.log('failed to add new slide: ' + record);
        });
    };

    $scope.removeSlide = function(slide) {
        var res = confirm("Do you mean to remove this slide?");
        if (res == true)
        {
            indexDBService.deleteRecord(slide.timeStamp, function(){
                $scope.init();
                $scope.message.text = "Record removed: " +  slide.location+'  |  ' + slide.name+'  |  ' +slide.imageAll.join(' ') + ' | ' +slide.date+'  |  RMB ' +slide.price+' | ' +slide.text;
                $scope.message.type = "alert-danger";
                $scope.$apply();
            });
        }
    };

    $scope.$watch('numPages', function () {           //catch any change to total pages available
        if($scope.numPages < $scope.currentPage){
            $scope.currentPage =  $scope.numPages;    //when currentPage is out of boundary, which normally happens under some filter condition, change it to the last page
        }
    });
    $scope.$watch('currentPage', function () {           //catch any change to current page number
        if($scope.currentPage == 0){
            $scope.currentPage =  1;                  //when currentPage is set to 0 by bootstrap ui, reset it to 1
        }
    });
    $scope.setDefaultFilter();                       //set default search value
    $scope.init();                                   //load slides
});

// open a modal box to show a specific slide
app.controller('ShowSlideModalCtrl', function($scope, $modalInstance, slide) {
    $scope.record = slide;
    $scope.exit = function() {              // only one close icon in show modal box
        $modalInstance.dismiss('cancel');
    };
});

// open a modal box to add a new slide record
app.controller('NewSlideModalCtrl', function($scope, $modalInstance) {
    $scope.newSlide = {};
    $scope.newSlide.date = new Date();
    $scope.newSlide.image = '';

    $scope.ok = function() {
        $modalInstance.close($scope.newSlide);          // confirmed save, return the newSlide to the caller in AppCtrl
    };
    $scope.cancel = function() {
        $modalInstance.dismiss('cancel');
    };

    $scope.selectFile = function(element) {    //select image files within the photos directory
        var filename = element.files[0].name;
        if(0 <= $scope.newSlide.image.indexOf(' '+ filename)) {  //check if image file already selected
            $scope.duplicateImg = true;
        }
        else{
            $scope.newSlide.image += ' ';
            $scope.newSlide.image += filename;  // newSlide.image is only for duplication check purpose
            $scope.newSlide.imageAll = $scope.newSlide.image.trim().split(' ');   // this is the one to persist
        }
        $scope.$apply();
    };

    $scope.clearError = function(){
        $scope.duplicateImg = false;       // hide the duplicate image error note
    };
});

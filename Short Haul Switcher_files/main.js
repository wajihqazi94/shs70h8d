geotab.addin.shortHaulSwitcher = function(api, state) {

    var switcherButton = document.getElementById("shs-switcherButton"),
        blockError = document.getElementById("shs-blockedError"),
        connectError = document.getElementById("shs-connectError"),
        title = document.getElementById("title-text"),
        driveAddInName = "Short Haul Switcher",
        shortHaulObj = {
            enabled: {
                val: "AmericaShortHaul8Day",
                lbl: "Remove Short Haul Exemption",
                title: "Short haul"
            },
            disabled: {
                val: "America8Day",
                lbl: "Apply Short Haul Exemption",
                title: "70 hr / 8 day"

            }
        },
        activeUser = [],
        blockSwitchingFromHOSRule = [
            'California', 'None'
        ], // Case-insensitive list of HOS rules that a user cannot be switching from

        //Want to store UserInfo(UserInfo,Id; Vehicle Info,Id;Time,Button Pushed;
        storingInfo = [],
        API_TIMEOUT_DURATION = 5000,
        shortHaulCache = [];

    var isOffline = function(state) {
        if (!state.online) {


            //switcherButton.disabled = false;
            blockError.style.display = 'none';
            connectError.style.display = 'none';
            //needs to be true to work accordingly
            return true;
        }
        //switcherButton.disabled = false;
        blockError.style.display = 'none';
        connectError.style.display = 'none';

        return false;
    };


    var isDrivingOnline = function(state) {
        if (!state.driving) {
            switcherButton.style.display = 'block';
            return true;
        }
        if (confirm("You are currently driving. You will need to stop and go ON Duty") == true) {
            switcherButton.style.display = 'block';
            return true;
        } else {
            setTimeout(function() {
                switcherButton.disabled = true;
                history.back();
            }, 10000);
            return false;
        }
    };

    var getActiveUser = function(callbackFunc, forceUserCheck) {
        console.log(forceUserCheck);
        forceUserCheck = forceUserCheck || false;
        api.getSession(function(credentials, server) {
            if (activeUser === null || activeUser.name !== credentials.userName || forceUserCheck) {
                api.call("Get", {
                    typeName: "User",
                    search: {
                        name: credentials.userName
                    }
                }, function(result) {
                    if (!result || !result.length) {
                        var msg = 'Could not find user: ' + credentials.userName;
                        consoleErr(msg);
                        api.mobile.notify(msg, 'Error');
                    }
                    activeUser = result[0];

                    if (typeof callbackFunc === 'function') {
                        callbackFunc();
                    }
                }, function(error) {
                    consoleErr(error);
                    api.mobile.notify(error, 'Error');
                });
            }
        }, false);
    };

    var consoleErr = function(msg) {
        console.log(driveAddInName + ': ' + msg);
    };

    var validateIfBlocked = function(user) {
        showSpinner('shs-switcherButton', true);

        for (var i = 0; i < blockSwitchingFromHOSRule.length; i++) {
            var blockItem = blockSwitchingFromHOSRule[i].toLowerCase();
            if (user.hosRuleSet.toLowerCase().indexOf(blockItem) > -1) {
                showSpinner('shs-switcherButton', false);

                switcherButton.style.display = "none";
                blockError.style.display = "block";
                return;
            }
        }
        showSpinner('shs-switcherButton', false);

        switcherButton.style.display = "block";
        blockError.style.display = "none";
    };

    var setButton = function(ruleVal) {
        if (ruleVal === shortHaulObj.enabled.val) {
            switcherButton.innerHTML = shortHaulObj.enabled.lbl;

        } else {
            switcherButton.innerHTML = shortHaulObj.disabled.lbl;
        }
    };

    var checkHOSRule = function(callback) {
        if (activeUser === null || typeof activeUser.hosRuleSet !== 'string')
            return;
        var ruleVal;
        console.log(ruleVal);
        if (activeUser.hosRuleSet === shortHaulObj.enabled.val) {
            //switcherButton.innerHTML = shortHaulObj.enabled.lbl;
            ruleVal = shortHaulObj.disabled.val; //Disable Short Haul
        } else {
            //switcherButton.innerHTML = shortHaulObj.disabled.lbl;
            ruleVal = shortHaulObj.enabled.val; //Enable Short Haul
        }

    };

    var storingInfoLocalStorage = function(state) {
        switcherButton.disabled = true;
        if (shortHaulCache.length > 0) {
            alert("There is a ruleset change wating to be applied. Please try again when you are online.");
            switcherButton.disabled = true;
            switcherButton.innerHTML = "Exemption saved";
        } else {

            var deviceId = state.device.id;
            var dateStamp = new Date();
            //ShortHaul cache saving
            shortHaulCache.push({
                date: dateStamp,
                device: {
                    id: deviceId
                }
            });
            /* //another global variable
                storingInfo.push({ "date": dateStamp },{ "state": state });

                // Re-serialize the array back into a string and store it in localStorage this is for testing
                localStorage.setItem('myInfo', JSON.stringify(storingInfo)); */
            alert("Currently Offline. This will be applied automatically the next time you're online")
            //No more clicking of button
            //console.log(activeUser);
            //start background process
            backgroundJob();
        }
    };
    var checkOnline = function(callback) {
        api.call("GetVersion", {

            }, function(result) {

                callback(true)
                return true;
            },
            function(error) {
                callback(false)
                return false;
            });
    };



    var myVar;
    var myRule;

    var backgroundJob = function() {
        if (shortHaulCache.length > 0) {
            checkOnline(function(isOnline) {
                if (isOnline) {
                    //alert("Calling all the to test mode")
                    if (activeUser == null) {
                        //alert("Active user null")
                        getActiveUser(function(success) {
                            if (success) {
                                sendUpdate(true, 0)
                                if (shortHaulCache[0].userId === 'undefined' || shortHaulCache[0].userId == activeUser.id) {
                                    sendUpdate(true, 0);
                                } else {
                                    shortHaulCache.length = 0;
                                }
                            }
                        })
                    } else {
                        //alert("calling sendUpdate")
                        sendUpdate(true, 0);
                    }
                } else {
                    setTimeout(function() {
                        backgroundJob();
                    }, API_TIMEOUT_DURATION);
                }
            });
        } else {
            /* clearTimeout(myVar); */
            /* 				 setTimeout(function(){
             */
            /* },1000); */
        }
        /* myVar = setTimeout(function () {
        //backgroundJob()
        }, API_TIMEOUT_DURATION); */
    };




    //callbackFunc
    var getActiveUserOffline = function() {
        api.getSession(function(credentials, server) {
            if (activeUser === null || activeUser.name !== credentials.userName) {
                api.call("Get", {
                    typeName: "User",
                    search: {
                        name: credentials.userName
                    }
                }, function(result) {
                    if (!result || !result.length) {
                        var msg = "Could not find user: " + credentials.userName;
                        consoleErr(msg);
                        api.mobile.notify(msg, "Error");
                    }
                    activeUser = result[0];
                    console.log(activeUser);

                }, function(error) {
                    consoleErr(error);
                    api.mobile.notify(error, "Error");
                });
            }
        });
    }

    var tempDeviceid = [];


    var previousDutyStatusLog = function() {
        //alert("Previous status")
        api.call("Get", {
            "typeName": "DutyStatusLog",
            "search": {
                "userSearch": {
                    "id": activeUser.id
                },
                "statuses": ["ON", "OFF", "SB", "D"],
                "fromDate": new Date().toISOString(),
                "includeBoundaryLogs": true
            }
        }, function(result) {

            if (result.length == 0) {
                addOnDutyLog();
            } else if (result.length > 0) {

                var previousDutyStatus = result[0].status;
                tempDeviceid = result[0].device.id;
                if (previousDutyStatus == "ON") {

                } else {
                    addOnDutyLog();
                }

            }


        }, function(error) {
            //alert(error);
        });
    }

    var addOnDutyLog = function() {
        //alert("Adding Status")
        api.call("Add", {
                typeName: "DutyStatusLog",
                entity: {
                    "driver": {
                        "id": activeUser.id
                    },
                    "device": {
                        "id": tempDeviceid
                    },
                    "dateTime": new Date(),
                    "status": "ON"

                }
            }, function(result) {
                //alert("Added status")
                tempDeviceid = 0;
            }, function(error) {}

        )
    }

    var sendUpdate = function(sendHistorical, counter) {

        var calls = [];
        if (counter == 0) {
            previousDutyStatusLog();

            /* figure out new ruleSet set to variable */
            if (activeUser.hosRuleSet === shortHaulObj.enabled.val) {
                //switcherButton.innerHTML = shortHaulObj.enabled.lbl;
                myRule = shortHaulObj.disabled.val; //Disable Short Haul
                activeUser.hosRuleSet = myRule;
            } else {
                //switcherButton.innerHTML = shortHaulObj.disabled.lbl;
                myRule = shortHaulObj.enabled.val; //Enable Short Haul
                activeUser.hosRuleSet = myRule;
            }
            calls.push(["Set", {
                typeName: "User",
                entity: activeUser
            }])


        }




        //var calls = [["Set", {typeName: "User", entity: activeUser}]];

        if (sendHistorical) {

            calls.push(
                /*["Add", {
                	typeName: "UserHosRuleSet", 
                	entity: {
                		"dateTime": shortHaulCache[0].date,
                		"user": { "id": activeUser.id },
                		"hosRuleSet": { "id": "HosRuleSet" + myRule }
                	}}],
                 ["Add", {
                	typeName: "DutyStatusLog",
                	entity: {
                		"driver": {
                			"id": activeUser.id
                		},
                		"device": {
                		"id":shortHaulCache[0].device.id},
                		"dateTime": shortHaulCache[0].date,
                		"status": "ON"

                	}
                }]*/
            )
        }


        //alert(activeUser.hosRuleSet);


        //alert("Loop");
        counter++;
        //alert(counter);
        //alert(calls.length);

        //setTimeout(function(){
        api.multiCall(calls, function(results) {
            calls = null;
            shortHaulCache = 0;
            shortHaulCache = [];
            sessionStorage.clear();
            alert("Ruleset changed")
            alert("Screen will refresh with new Ruleset");
            window.location.reload(false);
            //console.log(calls)
            //backgroundJob();
        }, function(error) {
            consoleErr(error);
            api.mobile.notify(error, "Error");
            if (counter < 3) {

                sendUpdate(sendHistorical, counter + 1);
            } else {
                console.log(error);
                if (!sendHistorical) {
                    localStorage.setItem('shortHaulCache', JSON.stringify(shortHaulCache));
                    // Change will be lost if driver change prior to going online.
                    // add to shortHaulCache also add to localStorage 
                }
            }
        });
        //},1000); 
    }
    //api call to test
    /* 	var apiCall= function(){
    		api.call("Add", { 
    			typeName: "UserHosRuleSet",
    			entity: {
    				"dateTime": shortHaulCache[0].date,
    				"user": { "id": activeUser.id },
    				"hosRuleSet": { "id": "HosRuleSet" + myRule }
    			}},function(result){
    				console.log(result)
    			},function(error){
    				consoleErr(error);
    			api.mobile.notify(error, "Error");
    			});
    	} */



    var showSpinner = function(id, showIt) {
        var elem = document.getElementById(id);
        if (showIt) {
            elem.className += ' shs-spinner';
        } else {
            elem.className = elem.className.replace(/\bshs-spinner\b/, '');
        }
    };

    var oneLastCheck = function(state) {
        switcherButton.disabled = true;
        api.call("GetVersion", {

            }, function(result) {
                toggleButton();
            },
            function(error) {

                storingInfoLocalStorage(state);

            });
    };

    var recheckOnline = function() {
        api.call("GetVersion", {

            }, function(result) {
                return true;
            },
            function(error) {
                return false;
            });
    };

    var toggleButton = function(event) {


        toggle_HOS_Rule();




    };

    var toggle_HOS_Rule = function(successCallback) {
        if (activeUser === null || typeof activeUser.hosRuleSet !== 'string')
            return;

        var ruleVal;
        if (activeUser.hosRuleSet === shortHaulObj.enabled.val)
            ruleVal = shortHaulObj.disabled.val; //Disable Short Haul
        else
            ruleVal = shortHaulObj.enabled.val; //Enable Short Haul

        getActiveUser(function() {
            setHOSRule(ruleVal, function(ruleValToVerify) {
                getActiveUser(function() {
                    // If the rule we set is what matches against the database, go ahead and toggle the UI
                    if (ruleValToVerify === activeUser.hosRuleSet) {
                        setButton(ruleValToVerify);
                    }
                }, true);

            })
        }, true);
    };

    var setHOSRule = function(newVal, callbackVerifyFunc) {
        showSpinner('shs-switcherButton', true);
        activeUser.hosRuleSet = newVal;
        previousDutyStatusLog();
        api.call("Set", {
            typeName: "User",
            entity: activeUser
        }, function(result) {
            callbackVerifyFunc(newVal);

            if (activeUser.hosRuleSet === shortHaulObj.enabled.val) {
                switcherButton.innerHTML = shortHaulObj.enabled.lbl;
                title.innerHTML = shortHaulObj.enabled.title;

            } else {
                switcherButton.innerHTML = shortHaulObj.disabled.lbl;
                title.innerHTML = shortHaulObj.disabled.title;

            }

            showSpinner('shs-switcherButton', false);
            shortHaulCache = 0;
            setTimeout(function() {

                switcherButton.disabled = false;
                window.location.reload(false);
            }, 1000);
        }, function(error) {
            var msg = 'setHOSRule(ERROR): ' + error;
            consoleErr(msg);
            api.mobile.notify(msg, 'Error');
            showSpinner('shs-switcherButton', false);
        });
    };

    //callbackFunc
    var getActiveUserOffline = function() {
        api.getSession(function(credentials, server) {
            if (activeUser === null || activeUser.name !== credentials.userName) {
                api.call("Get", {
                    typeName: "User",
                    search: {
                        name: credentials.userName
                    }
                }, function(result) {
                    if (!result || !result.length) {
                        var msg = "Could not find user: " + credentials.userName;
                        consoleErr(msg);
                        api.mobile.notify(msg, "Error");
                    }
                    activeUser = result[0];
                    console.log(activeUser);

                }, function(error) {
                    consoleErr(error);
                    api.mobile.notify(error, "Error");
                });
            }
        });
    }



    return {
        /**
         * initialize() is called only once when the Add-In is first loaded. Use this function to initialize the
         * Add-In's state such as default values or make API requests (MyGeotab or external) to ensure interface
         * is ready for the user.
         * @param {object} api - The GeotabApi object for making calls to MyGeotab.
         * @param {object} state - The page state object allows access to URL, page navigation and global group filter.
         * @param {function} addInReady - Call this when your initialize route is complete. Since your initialize routine
         *        might be doing asynchronous operations, you must call this method when the Add-In is ready
         *        for display to the user.
         */
        initialize: function(api, state, addInReady) {
            // MUST call addInReady when done any setup
            addInReady();
        },

        /**
         * focus() is called whenever the Add-In receives focus.
         *
         * The first time the user clicks on the Add-In menu, initialize() will be called and when completed, focus().
         * focus() will be called again when the Add-In is revisited. Note that focus() will also be called whenever
         * the global state of the MyGeotab application changes, for example, if the user changes the global group
         * filter in the UI.
         *
         * @param {object} api - The GeotabApi object for making calls to MyGeotab.
         * @param {object} state - The page state object allows access to URL, page navigation and global group filter.
         */
        focus: function(api, state) {
            switcherButton.disabled = true;
            connectError.disabled = true;
            blockError.disabled = true;
            blockError.innerHTML = "Waiting for connection"

            setTimeout(function() {
                if (shortHaulCache.length > 0) {
                    alert("Something stored allow for connection to re establish first")
                    switcherButton.disabled = true;
                } else {



                    if (recheckOnline()) {
                        switcherButton.innerHTML = "Toggle (Uknown Status)";
                        blockError.style.display = 'none';
                        connectError.style.display = 'none';
                        switcherButton.disabled = false;
                        switcherButton.addEventListener('click', function() {
                            oneLastCheck(state);
                        }, false);

                    } else {
                        isDrivingOnline(state);
                        getActiveUser(function() {
                            validateIfBlocked(activeUser);
                            setButton(activeUser.hosRuleSet);
                            switcherButton.disabled = false;

                        }, true);
                        switcherButton.addEventListener('click', function() {
                            oneLastCheck(state);
                        });
                    }
                }
            }, 1000);
        },
        /**
         * blur() is called whenever the user navigates away from the Add-In.
         *
         * Use this function to save the page state or commit changes to a data store or release memory.
         *
         * @param {object} api - The GeotabApi object for making calls to MyGeotab.
         * @param {object} state - The page state object allows access to URL, page navigation and global group filter.
         */
        blur: function(api, state) {

            //switcherButton.removeEventListener('click', toggleButton);

        }
    };
};

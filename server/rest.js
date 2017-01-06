JsonRoutes.Middleware.use(
  '/api/*',
  oAuth2Server.oauthserver.authorise()   // OAUTH FLOW - A7.1
);



JsonRoutes.add("get", "/fhir/Patient/:id", function (req, res, next) {
  process.env.DEBUG && console.log('GET /fhir/Patient/' + req.params.id);
  process.env.DEBUG && console.log('GET /fhir/Patient/' + req.query._count);

  res.setHeader("Access-Control-Allow-Origin", "*");

  var accessTokenStr = (req.params && req.params.access_token) || (req.query && req.query.access_token);
  var accessToken = oAuth2Server.collections.accessToken.findOne({accessToken: accessTokenStr});

  if (accessToken || process.env.NOAUTH || Meteor.settings.private.disableOauth) {

    if (accessToken) {
      process.env.TRACE && console.log('accessToken', accessToken);
      process.env.TRACE && console.log('accessToken.userId', accessToken.userId);
    }

    // if (typeof SiteStatistics === "object") {
    //   SiteStatistics.update({_id: "configuration"}, {$inc:{
    //     "Patients.count.read": 1
    //   }});
    // }

    var patientData = Patients.findOne({_id: req.params.id});
    delete patientData._document;

    process.env.TRACE && console.log('patientData', patientData);

    JsonRoutes.sendResult(res, {
      code: 200,
      data: patientData
    });
  } else {
    JsonRoutes.sendResult(res, {
      code: 401
    });
  }
});



JsonRoutes.add("get", "/fhir/Patient", function (req, res, next) {
  process.env.DEBUG && console.log('GET /fhir/Patient', req.query);
  // console.log('GET /fhir/Patient', req.query);
  // console.log('process.env.DEBUG', process.env.DEBUG);

  res.setHeader("Access-Control-Allow-Origin", "*");

  var accessTokenStr = (req.params && req.params.access_token) || (req.query && req.query.access_token);
  var accessToken = oAuth2Server.collections.accessToken.findOne({accessToken: accessTokenStr});

  if (accessToken || process.env.NOAUTH || Meteor.settings.private.disableOauth) {

    if (accessToken) {
      process.env.TRACE && console.log('accessToken', accessToken);
      process.env.TRACE && console.log('accessToken.userId', accessToken.userId);
    }

    if (typeof SiteStatistics === "object") {
      SiteStatistics.update({_id: "configuration"}, {$inc:{
        "Patients.count.search-type": 1
      }});
    }

    var databaseQuery = {};

    if (req.query.family) {
      databaseQuery['name'] = {
        $elemMatch: {
          'family': req.query.family
        }
      };
    }
    if (req.query.given) {
      databaseQuery['name'] = {
        $elemMatch: {
          'given': req.query.given
        }
      };
    }
    if (req.query.name) {
      databaseQuery['name'] = {
        $elemMatch: {
          'text': req.query.name
        }
      };
    }
    if (req.query.identifier) {
      databaseQuery['identifier'] = {
        $elemMatch: {
          'value': req.query.identifier
        }
      };
    }
    if (req.query.gender) {
      databaseQuery['gender'] = req.query.gender;
    }
    if (req.query.birthdate) {
      databaseQuery['birthDate'] = req.query.birthdate;
    }

    process.env.DEBUG && console.log('databaseQuery', databaseQuery);
    process.env.DEBUG && console.log('Patients.find(id)', Patients.find(databaseQuery).fetch());

    // // because we're using BaseModel and a _transform() function
    // // Patients returns an object instead of a pure JSON document
    // // it stores a shadow reference of the original doc, which we're removing here
    // var patientData = Patients.find(databaseQuery).fetch();

    var searchLimit = 1;
    var patientData = Patients.fetchBundle(databaseQuery);

    // var patientData;
    // if (Patients.find(databaseQuery).count() > 1) {
    //   patientData = Patients.fetchBundle(databaseQuery);
    // } else {
    //   patientData = Patients.findOne(databaseQuery);
    //   delete patientData._document;
    // }

    JsonRoutes.sendResult(res, {
      code: 200,
      data: patientData
    });
  } else {
    JsonRoutes.sendResult(res, {
      code: 401
    });
  }
});


JsonRoutes.add("post", "/fhir/Patient/:param", function (req, res, next) {
  process.env.DEBUG && console.log('GET /fhir/Patient/' + JSON.stringify(req.query));

  res.setHeader("Access-Control-Allow-Origin", "*");

  var accessTokenStr = (req.params && req.params.access_token) || (req.query && req.query.access_token);
  var accessToken = oAuth2Server.collections.accessToken.findOne({accessToken: accessTokenStr});

  if (accessToken || process.env.NOAUTH || Meteor.settings.private.disableOauth) {

    if (accessToken) {
      process.env.TRACE && console.log('accessToken', accessToken);
      process.env.TRACE && console.log('accessToken.userId', accessToken.userId);
    }

    var patientData;

    if (req.params.param === '_search') {
      var searchLimit = 1;
      if (req && req.query && req.query._count) {
        searchLimit = parseInt(req.query._count);
      }
      patientData = Patients.fetchBundle({}, {limit: searchLimit});
    }

    process.env.TRACE && console.log('patientData', patientData);

    JsonRoutes.sendResult(res, {
      code: 200,
      data: patientData
    });
  } else {
    JsonRoutes.sendResult(res, {
      code: 401
    });
  }
});


JsonRoutes.add("post", "/fhir/Patient", function (req, res, next) {
  process.env.DEBUG && console.log('GET /fhir/Patient/', req.body);

  res.setHeader("Access-Control-Allow-Origin", "*");

  var accessTokenStr = (req.params && req.params.access_token) || (req.query && req.query.access_token);
  var accessToken = oAuth2Server.collections.accessToken.findOne({accessToken: accessTokenStr});

  if (accessToken || process.env.NOAUTH || Meteor.settings.private.disableOauth) {

    if (accessToken) {
      process.env.TRACE && console.log('accessToken', accessToken);
      process.env.TRACE && console.log('accessToken.userId', accessToken.userId);
    }

    var patientData;
    var newPatient;

    if (req.body) {
      newPatient = req.body;
      PatientSchema.clean(newPatient);

      newPatient.name.forEach(function(name){
        HumanName.clean(name);
      });
      newPatient.contact.forEach(function(contact){
        HumanName.clean(contact.name);        
      });

      patientData = Patients.insert(newPatient);

      process.env.TRACE && console.log('patientData', patientData);
      JsonRoutes.sendResult(res, {
        code: 201,
        data: patientData
      });
    } else {
      JsonRoutes.sendResult(res, {
        code: 200
      });

    }

  } else {
    JsonRoutes.sendResult(res, {
      code: 401
    });
  }
});



// WebApp.connectHandlers.use("/fhir/Patient", function(req, res, next) {
//   res.setHeader("Access-Control-Allow-Origin", "*");
//   return next();
// });

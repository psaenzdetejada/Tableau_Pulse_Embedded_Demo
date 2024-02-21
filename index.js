// npm intall express -s
const express = require("express");
// npm install cors
const cors = require('cors');
const app = express();
// npm install axios
const axios = require("axios");
const uuid = require('uuid');
const CryptoJS = require('crypto-js');

const tableauUrl = "tableau-URL"; // Tableau Cloud url. For example: "https://10ax.online.tableau.com"
const apiVersion = "3.21";
const apiUrl = tableauUrl + "/api/" + apiVersion + "/auth/signin";
const siteName = "my-Site-Name"; // Tableau Cloud Site Name. For example: "mySite"
const userName  = "user-name-email" // Username. Normally the email address the user uses to log in Tableau Cloud. 
const caClientId = "client-id"; // Connected App Client ID
const caSecretId = "secret-id"; // Connected App Secret ID
const caSecretValue = "secret-value"; // Connected App Secret Value

app.set("port", process.env.PORT || 3000);
app.use(cors());
app.use(express.urlencoded({extended:false}));
app.use(express.json());

app.get("/data", async (request, response)=>{
    console.log("Request received...");
    console.log("FROM: ",request.url);
    console.log("METHOD: ",request.method);   
    console.log("User-Agent: ",request.headers["user-agent"]);

    const myToken = getJWT();
    console.log(myToken);

    const credentials = 
    {
        "credentials": {
            "jwt": myToken,
            "site": {
                "contentUrl": siteName
            }
        }
    };
    
    // Send an API request to get the Subscriptions for a specific User.
    try {
        let [token, userId] = await apiAuth(credentials, apiUrl);
        let userSubscribedMetrics = await apiSubscribedMetrics(token, userId);
        let metricsArray = await apiMetricsArray(token, userSubscribedMetrics);
        let definitionIds = buildDefinitionIds(metricsArray);
        let definitionsArray = await apiDefinitionsArray(token, definitionIds);
        let insights = await apiInsights(token, definitionsArray, metricsArray);
        let detailInsights = await apiInsightsDetail(token, definitionsArray, metricsArray);
        console.log(response);
        response.status(200).json({definitionsArray: definitionsArray, metricsArray: metricsArray, insights: insights, detailInsights: detailInsights});
    } catch (error) {
        console.error('Error:', error);
        response.status(500).json({ error: 'An error occurred while fetching data from the API.' });
    }

} )

app.use((req,res, next)=>{
    res.status(404).json({message: "Endpoint not found"})
});

function errorHandling(err, req, res, next) {
    res.status(500).json({message: err.message});
}

app.use(errorHandling);

app.listen(app.get("port"), ()=>{
    console.log("Server listening on port", app.get("port"))}
);

function base64url(source) {
    let encodedSource = CryptoJS.enc.Base64.stringify(source);
    encodedSource = encodedSource.replace(/=+$/, '');
    encodedSource = encodedSource.replace(/\+/g, '-');
    encodedSource = encodedSource.replace(/\//g, '_');
    return encodedSource;
}

function getJWT() {
    let userToken = "";
    let siteId = "";
    let userId = "";

    const header = {
        alg: "HS256",
        typ: "JWT",
        kid: caSecretId,
        iss: caClientId
    };

    const payload = {
        iss: caClientId,
        exp: Math.floor(new Date().getTime() / 1000) + 9 * 60, // Expires in 9 minutes
        jti: uuid.v4(),
        aud: "tableau",
        sub: userName,
        scp: ["tableau:insights:embed","tableau:insight_definitions_metrics:read","tableau:insights:read"]
    };
    
    const stringifiedHeader = CryptoJS.enc.Utf8.parse(JSON.stringify(header));
    const encodedHeader = base64url(stringifiedHeader);
    const stringifiedPayload = CryptoJS.enc.Utf8.parse(JSON.stringify(payload));
    const encodedPayload = base64url(stringifiedPayload);

    // Create Signature
    const signature = CryptoJS.HmacSHA256(encodedHeader + "." + encodedPayload, caSecretValue);
    const encodedSignature = base64url(signature);

    // Concatenate JWT
    const jwtToken = encodedHeader + "." + encodedPayload + "." + encodedSignature;

    return jwtToken;    
}

async function apiAuth(credentials, apiUrl) {
    console.log("Authenticating to Tableau through the API...")
    let apiResponse = await axios({
        method: "post",
        url: apiUrl,
        headers: {
            'Content-Type': 'application/json',
        },
        data: JSON.stringify(credentials)
    })
    const token = apiResponse.data.credentials.token
    const userId = apiResponse.data.credentials.user.id
    return [token, userId]
}

async function apiSubscribedMetrics(token, userId) {
    console.log("Getting User's subscribed metrics...")
    const myApi = await axios({
        method: "get",
        url: tableauUrl+"/api/-/pulse/subscriptions?user_id="+userId,
        headers: {
            'Content-Type': 'application/json',
            'X-Tableau-Auth': token,
        }
    });
    const secondResponse = myApi.data;
    return secondResponse.subscriptions.map(item => item.metric_id);
}

async function apiMetricsArray(token, userSubscribedMetrics) {
    console.log("Getting Metric data...")
    let metricsArray = [];
    for (const n of userSubscribedMetrics) {
        const getMetric = await axios({
            method: "get",
            url: tableauUrl + "/api/-/pulse/metrics/" + n,
            headers: {
                'Content-Type': 'application/json',
                'X-Tableau-Auth': token,
            }
        });
        const metricResponse = getMetric.data;
        metricsArray.push(metricResponse);
    }
    return metricsArray;
}

function buildDefinitionIds(metricsArray) {
    console.log("Getting Metric Definition data...")
    const idDefinitionMap = {};
    const definitionIds = [];
    metricsArray.forEach((item, index) => {
        const { id, specification, definition_id } = item.metric;
        idDefinitionMap[index] = {
            metric_id: id,
            metric_specification: specification,
            definition_id: definition_id
        };
        definitionIds.push(definition_id);
    });
    console.log(definitionIds);
    return definitionIds;
}

async function apiDefinitionsArray(token, definitionIds) {
    console.log("Getting Metric Definition Default View...")
    let definitionsArray = [];
    for (const i of definitionIds) {
        const getDefinitions = await axios({
            method: "get",
            url: tableauUrl + "/api/-/pulse/definitions/" + i + "?view=DEFINITION_VIEW_BASIC",
            headers: {
                'Content-Type': 'application/json',
                'X-Tableau-Auth': token,
            }
        });
        const definitionResponse = getDefinitions.data;
        definitionsArray.push(definitionResponse);
    }
    return definitionsArray;
}

async function apiInsights(token, definitionsArray, metricsArray) {
    console.log("Getting Metrics Insights...")
    // Convert definitionsArray to a JSON object
    const definitionsJsonObject = JSON.parse(JSON.stringify(definitionsArray));

    const combinedObjectArray = [];

    for (let i = 0; i < Math.min(metricsArray.length, definitionsJsonObject.length); i++) {
        const combinedObject = {
            "bundle_request": {
            "version": 1,
            "options": {
                "output_format": "OUTPUT_FORMAT_TEXT",
                "time_zone": "Europe/Madrid"
            },
            "input": {}
            }
        };        
        let cloned = Object.assign({},combinedObject)
        const metricInfo = metricsArray[i].metric;
        const definitionInfo = definitionsJsonObject[i].definition;
    
        // Populate the combined object based on the current index
        combinedObject.bundle_request.input = {
            "metadata": {
                "name": definitionInfo.metadata.name,
                "metric_id": metricInfo.id,
                "definition_id": definitionInfo.metadata.id
            },
            "metric": {
                "definition": {
                "datasource": definitionInfo.specification.datasource,
                "basic_specification": definitionInfo.specification.basic_specification,
                "is_running_total": definitionInfo.specification.is_running_total
                },
                "metric_specification": metricInfo.specification,
                "extension_options": definitionInfo.extension_options,
                "representation_options": {
                "type": "NUMBER_FORMAT_TYPE_NUMBER",
                "number_units": {
                    "singular_noun": "hour",
                    "plural_noun": "hours"
                },
                "sentiment_type": definitionInfo.representation_options.sentiment_type,
                "row_level_id_field": definitionInfo.representation_options.row_level_id_field,
                "row_level_entity_names": definitionInfo.representation_options.row_level_entity_names
                },
                "insights_options": definitionInfo.insights_options
            }
        };
        combinedObjectArray.push(combinedObject);
    }

    const promises = [];
    combinedObjectArray.forEach(element => {
        promises.push(
            axios({
                method: "post",
                url: tableauUrl + "/api/-/pulse/insights/ban",
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tableau-Auth': token
                },
                data: JSON.stringify(element)
            })
        )
    });

    const banResults = await Promise.all(promises);
    return banResults.map(response => response.data.bundle_response.result);
}

async function apiInsightsDetail(token, definitionsArray, metricsArray) {
    console.log("Getting full Metric Insights data...")
    // Convert definitionsArray to a JSON object
    const definitionsJsonObject = JSON.parse(JSON.stringify(definitionsArray));

    const combinedObjectArray = [];

    for (let i = 0; i < Math.min(metricsArray.length, definitionsJsonObject.length); i++) {
        const combinedObject = {
            "bundle_request": {
            "version": 1,
            "options": {
                "output_format": "OUTPUT_FORMAT_TEXT",
                "time_zone": "Europe/Madrid"
            },
            "input": {}
            }
        };        
        let cloned = Object.assign({},combinedObject)
        const metricInfo = metricsArray[i].metric;
        const definitionInfo = definitionsJsonObject[i].definition;
    
        // Populate the combined object based on the current index
        combinedObject.bundle_request.input = {
            "metadata": {
                "name": definitionInfo.metadata.name,
                "metric_id": metricInfo.id,
                "definition_id": definitionInfo.metadata.id
            },
            "metric": {
                "definition": {
                "datasource": definitionInfo.specification.datasource,
                "basic_specification": definitionInfo.specification.basic_specification,
                "is_running_total": definitionInfo.specification.is_running_total
                },
                "metric_specification": metricInfo.specification,
                "extension_options": definitionInfo.extension_options,
                "representation_options": {
                "type": "NUMBER_FORMAT_TYPE_NUMBER",
                "number_units": {
                    "singular_noun": "hour",
                    "plural_noun": "hours"
                },
                "sentiment_type": definitionInfo.representation_options.sentiment_type,
                "row_level_id_field": definitionInfo.representation_options.row_level_id_field,
                "row_level_entity_names": definitionInfo.representation_options.row_level_entity_names
                },
                "insights_options": definitionInfo.insights_options
            }
        };
        combinedObjectArray.push(combinedObject);
    }

    const promises = [];
    combinedObjectArray.forEach(element => {
        promises.push(
            axios({
                method: "post",
                url: tableauUrl + "/api/-/pulse/insights/detail",
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tableau-Auth': token
                },
                data: JSON.stringify(element)
            })
        )
    });

    const detailResults = await Promise.all(promises);

    return detailResults.map(response => response.data.bundle_response.result);
}
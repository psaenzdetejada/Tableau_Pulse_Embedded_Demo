window.onload = async ()=>{
    const myApiResponse = await fetch("http://localhost:3000/data")
    const parsedResponse = await myApiResponse.json();
    
    metricsFollowed = parsedResponse.definitionsArray.length;
    document.getElementById('metricsValue').innerText = metricsFollowed;
    document.getElementById('dynamicHeader').style.display = 'block';

    console.log(typeof(parsedResponse));
    console.log(parsedResponse);
    n = parsedResponse.definitionsArray.length;

    let body = document.querySelector("body");

    const container = document.getElementById("metricList");

    for (let i = 0; i < n; i++) {
         const card = document.createElement("li");
        card.classList.add("_card_w86tc_1");
        const heading1 = document.createElement("h1");
        heading1.textContent = parsedResponse.definitionsArray[i].definition.metadata.name;
        heading1.classList.add("metric-card-title");

        // Build a RoundCircle with the direction.
        const direction = document.createElement("p");
        direction.textContent = "# of metrics: " + parsedResponse.definitionsArray[i].definition.total_metrics;
        if (parsedResponse.insights[i].insight_groups[0].insights[0].result.facts.difference.direction == "flat") {
            direction.textContent = "flat";
            direction.classList.add("roundCircleFlat");
        } else if (parsedResponse.insights[i].insight_groups[0].insights[0].result.facts.difference.direction == "down") {
            direction.textContent = parsedResponse.insights[i].insight_groups[0].insights[0].result.facts.difference.direction;
            direction.classList.add("roundCircleDown");
        }
        else {
            direction.textContent = parsedResponse.insights[i].insight_groups[0].insights[0].result.facts.difference.direction;
            direction.classList.add("roundCircleUp");
        }
        direction.classList.add("roundCircle");
        
        const contentContainer = document.createElement("div");
        contentContainer.classList.add("content-container");
        contentContainer.appendChild(heading1);
        contentContainer.appendChild(direction);
        card.appendChild(contentContainer);

        const description = document.createElement("p");
        if (parsedResponse.definitionsArray[i].definition.metadata.description == "") {
            description.textContent = "The metric does not have a description.";
        } else {
        description.textContent = parsedResponse.definitionsArray[i].definition.metadata.description;
        }
        description.classList.add("metric-card-granularity");
        card.appendChild(description);

        const ban = document.createElement("p");
        ban.textContent = parsedResponse.insights[i].insight_groups[0].insights[0].result.facts.target_period_value.formatted;
        ban.classList.add("ban-number");

        const detailsContainer = document.createElement("div");
        detailsContainer.classList.add("moreDetails-container");
        detailsContainer.appendChild(ban);
        card.appendChild(detailsContainer);

        const loopContainer = document.createElement("div");
        loopContainer.classList.add("loop-container");

        for (let j = 0; j < parsedResponse.detailInsights[i].insight_groups[3].insights.length; j++) {
            const singleContainer = document.createElement("div");
            singleContainer.classList.add("single-container");

            const insightType = document.createElement("p");
            insightType.textContent = parsedResponse.detailInsights[i].insight_groups[3].insights[j].insight_type;
            insightType.classList.add("insightType-text");
            // detailsContainer.appendChild(insightType);

            const question = document.createElement("p");
            question.textContent = parsedResponse.detailInsights[i].insight_groups[3].insights[j].result.question;
            question.classList.add("question-text");
            // detailsContainer.appendChild(question);

            const markup = document.createElement("p");
            markup.textContent = parsedResponse.detailInsights[i].insight_groups[3].insights[j].result.markup;
            markup.classList.add("markup-text");
            // detailsContainer.appendChild(markup);

            singleContainer.appendChild(insightType);
            singleContainer.appendChild(question);
            singleContainer.appendChild(markup);
            loopContainer.appendChild(singleContainer);
        }

        const insightContainer = document.createElement("div");
        insightContainer.classList.add("insight-container-container");
        insightContainer.appendChild(loopContainer);
        detailsContainer.appendChild(insightContainer);
                
        container.appendChild(card);
    }

    const sideBarLu = document.getElementById("menuBarList");

    parsedResponse.definitionsArray.forEach(item => {
        const liElement = document.createElement("li");
        liElement.textContent = item.definition.metadata.name;
        liElement.classList.add(".menu");
        sideBarLu.appendChild(liElement);
    })
}

function nextDetail(ev) {
    let singleDetails = document.querySelector(".single-container");
    let width = singleDetails.getBoundingClientRect().width;
    let loopContainer = document.querySelector(".loop-container");
    loopContainer.left = loopContainer.left - width;
}
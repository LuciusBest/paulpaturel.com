window.addEventListener("load", () => {
    const toper = document.getElementById("toper");
    const container = document.getElementById("mainContainer");

    const projectTags = {
        "OBI_STRIPE": {
            when: ["#2023"],
            how: ["#3D"],
            what: ["#Animation"]
        },
        "LOTTOFPRINTS": {
            when: ["#2024"],
            how: ["#Print"],
            what: ["#EditorialDesign", "#Typography"]
        },
        "SENS_UNIK": {
            when: ["#2022"],
            how: ["#Print"],
            what: ["#Music", "#Layout"]
        },
        "SYNTHETIC_ORGANIC": {
            when: ["#2023"],
            how: ["#3D"],
            what: ["#SpeculativeDesign"]
        },
        "V_KEYBOARD": {
            when: ["#2024"],
            how: ["#3D"],
            what: ["#Concept"]
        }
    };

    function createTagSpan(text, category) {
        const span = document.createElement("span");
        span.className = `tag ${category}`;
        span.textContent = text;
        return span;
    }

    let currentProject = null;

    function updateToper(projectName) {
        if (projectName === currentProject) return;
        currentProject = projectName;
        toper.innerHTML = "";

        const tags = projectTags[projectName];
        if (!tags) return;

        ["when", "how", "what"].forEach(category => {
            if (tags[category]) {
                tags[category].forEach(tag => {
                    toper.appendChild(createTagSpan(tag, category));
                });
            }
        });
    }

    container.addEventListener("scroll", () => {
        const scrollTop = container.scrollTop;
        const index = Math.round(scrollTop / window.innerHeight);
        const projects = document.querySelectorAll(".project_container");
        const active = projects[index];
        if (!active) return;

        const name = active.dataset.project;
        updateToper(name);
    });

    // Initial call
    setTimeout(() => {
        const index = Math.round(container.scrollTop / window.innerHeight);
        const projects = document.querySelectorAll(".project_container");
        const active = projects[index];
        if (active) updateToper(active.dataset.project);
    }, 100);
});

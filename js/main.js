document.addEventListener("DOMContentLoaded", async () => {
    const container = document.getElementById("mainContainer");

    try {
        const response = await fetch("js/images.json");
        const imagesData = await response.json();

        Object.entries(imagesData).forEach(([folder, files]) => {
            const projectDiv = document.createElement("div");
            projectDiv.className = "project_container";
            projectDiv.dataset.project = folder;

            files.forEach(file => {
                const filePath = `images/${folder}/${file}`;
                const ext = file.split('.').pop().toLowerCase();

                const wrapper = document.createElement("div");
                wrapper.className = "media_wrapper";

                if (["jpg", "jpeg", "png", "gif", "webp", "heic"].includes(ext)) {
                    const img = document.createElement("img");
                    img.src = filePath;
                    img.alt = `Image ${folder}`;
                    wrapper.appendChild(img);
                } else if (["mp4", "webm", "mov"].includes(ext)) {
                    const video = document.createElement("video");
                    video.src = filePath;
                    video.controls = true;
                    video.muted = true;
                    video.loop = true;
                    video.autoplay = true;
                    video.style.height = "100%";
                    video.style.objectFit = "contain";
                    wrapper.appendChild(video);
                }

                projectDiv.appendChild(wrapper);
            });

            container.appendChild(projectDiv);
        });
    } catch (error) {
        console.error("Erreur lors du chargement des projets :", error);
    }
});

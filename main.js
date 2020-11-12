const url = "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf";
const pdfjsLib = window["pdfjs-dist/build/pdf"];
pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.6.347/pdf.worker.min.js";
const uploadScale = 2; // pdf resolution
let pdfDoc = null;
let renderCount = 0;
let renderingFinished = false;
let fileName = "";
const command = {
    UP: 0,
    DOWN: 1,
    TOP: 2,
    MIDDLE: 3,
    BOTTOM: 4,
    PREVIOUS: 5,
    NEXT: 6,
    FIRST: 7,
    LAST: 8
}
let commandState = command.TOP;

function renderPage(num, canvas, ctx) {
    pdfDoc.getPage(num).then(function (page) {
        var viewport = page.getViewport({ scale: uploadScale });
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        var renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };
        var renderTask = page.render(renderContext);
        renderTask.promise.then(function () {
            console.log(`Page ${num}/${pdfDoc.numPages} rendering finished`);
            if (++renderCount === pdfDoc.numPages) {
                console.log("All pages rendering finished");
                renderingFinished = true;
            }
        });
    });
}

function renderAllPages(pdfDoc_) {
    pdfDoc = pdfDoc_;
    window.scrollTo(0, 0);
    document.getElementById("page").textContent = `1 / ${pdfDoc.numPages}`;
    const canvasWrapper = document.getElementById("canvas-wrapper");
    canvasWrapper.innerHTML = "";
    renderCount = 0;
    renderingFinished = false;
    for (let i = 0; i < pdfDoc.numPages; i++) {
        const canvas = document.createElement("canvas");
        canvas.classList.add("canvas");
        if (i > 0) {
            canvas.classList.add("page-break");
        }
        canvas.id = `canvas${i}`;
        canvasWrapper.appendChild(canvas);
        const ctx = canvas.getContext("2d");
        renderPage(i + 1, canvas, ctx);
    }
}

function uploadPDF(file) {
    if (file.name.split('.').pop() !== "pdf") {
        alert("Please upload a PDF file.");
        return;
    }
    const fileReader = new FileReader();
    fileReader.onload = function () {
        const typedarray = new Uint8Array(this.result);
        const loadingTask = pdfjsLib.getDocument(typedarray);
        loadingTask.promise.then(pdfDoc_ => {
            fileName = file.name;
            renderAllPages(pdfDoc_);
        }, function () {
            alert("The uploaded PDF file is corrupted.");
            return;
        });
    };
    fileReader.readAsArrayBuffer(file);
}

document.getElementById("commands").addEventListener("click", function (e) {
    alert('"SCROLL UP": scroll up\n"SCROLL DOWN": scroll down\n"SCROLL TOP": scroll to the top of the page\n"SCROLL MIDDLE": scroll to the middle of the page\n"SCROLL BOTTOM": scroll to the bottom of the page\n"SCROLL PREVIOUS": scroll to the previous page\n"SCROLL NEXT": scroll to the next page\n"SCROLL FIRST": scroll to the first page\n"SCROLL LAST": scroll to the last page');
});


document.getElementById("upload").addEventListener("change", function (e) {
    const file = e.target.files[0];
    uploadPDF(file);
});

document.getElementById("upload-button").addEventListener("click", function (e) {
    const upload = document.getElementById("upload");
    upload.click();
});


function scroll(newCommandState) {
    if (newCommandState === command.FIRST) {
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: "smooth"
        });
        return;
    }
    else if (newCommandState === command.LAST) {
        window.scrollTo({
            top: document.body.scrollHeight,
            left: 0,
            behavior: "smooth"
        });
        return;
    }
    const canvases = document.getElementsByClassName("canvas");
    for (let i = 0; i < canvases.length; i++) {
        const canvas = canvases[i];
        const canvasRect = canvas.getBoundingClientRect();
        const windowHeight = (window.innerHeight || document.documentElement.clientHeight);
        const windowWidth = (window.innerWidth || document.documentElement.clientWidth);
        const vertInView = (canvasRect.top <= windowHeight) && ((canvasRect.top + canvasRect.height * 0.75) >= 0);
        const horInView = (canvasRect.left <= windowWidth) && ((canvasRect.left + canvasRect.width) >= 0);
        if (vertInView && horInView) {
            if (newCommandState === command.UP) {
                switch (commandState) {
                    case command.TOP:
                        newCommandState = command.PREVIOUS;
                        break;
                    case command.MIDDLE:
                        newCommandState = command.TOP;
                        break;
                    case command.BOTTOM:
                        newCommandState = command.MIDDLE;
                        break;
                }
            }
            else if (newCommandState === command.DOWN) {
                switch (commandState) {
                    case command.TOP:
                        newCommandState = command.MIDDLE;
                        break;
                    case command.MIDDLE:
                        newCommandState = command.BOTTOM;
                        break;
                    case command.BOTTOM:
                        newCommandState = command.NEXT;
                        break;
                }
            }
            let scrollOffsetY = 0;
            switch (newCommandState) {
                case command.TOP:
                    scrollOffsetY = 0;
                    commandState = command.TOP;
                    break;
                case command.MIDDLE:
                    scrollOffsetY = (canvasRect.height - windowHeight) * 0.5;
                    commandState = command.MIDDLE;
                    break;
                case command.BOTTOM:
                    scrollOffsetY = canvasRect.height - windowHeight;
                    commandState = command.BOTTOM;
                    break;
                case command.PREVIOUS:
                    scrollOffsetY = -windowHeight - 21;
                    commandState = command.BOTTOM;
                    break;
                case command.NEXT:
                    scrollOffsetY = canvasRect.height + 21;
                    commandState = command.TOP;
                    break;
            }
            window.scrollTo({
                top: 66 + (canvasRect.height + 21) * i + scrollOffsetY,
                left: 0,
                behavior: "smooth"
            });
            break;
        }
    }
}

const SpeechRecognition = webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.lang = "en-US";
recognition.start();

recognition.onresult = (event) => {
    const speechResult = event.results[0][0].transcript;
    console.log("You said:", speechResult);
    const speechCommands = speechResult.split(" ");
    for (let speechCommand of speechCommands) {
        speechCommand = speechCommand.toUpperCase();
        if (speechCommand.includes("UP")) {
            scroll(command.UP);
        }
        else if (speechCommand.includes("DOWN")) {
            scroll(command.DOWN);
        }
        else if (speechCommand.includes("TOP")) {
            scroll(command.TOP);
        }
        else if (speechCommand.includes("MIDDLE")) {
            scroll(command.MIDDLE);
        }
        else if (speechCommand.includes("BOTTOM")) {
            scroll(command.BOTTOM);
        }
        else if (speechCommand.includes("PREVIOUS")) {
            scroll(command.PREVIOUS);
        }
        else if (speechCommand.includes("NEXT")) {
            scroll(command.NEXT);
        }
        else if (speechCommand.includes("FIRST")) {
            scroll(command.FIRST);
        }
        else if (speechCommand.includes("LAST")) {
            scroll(command.LAST);
        }
    }
}

recognition.onend = () => {
    console.log("The speech recognition has ended. Restarting...");
    recognition.start();
}

window.addEventListener("scroll", function (e) {
    const canvases = document.getElementsByClassName("canvas");
    for (let i = 0; i < canvases.length; i++) {
        const canvas = canvases[i];
        const canvasRect = canvas.getBoundingClientRect();
        const windowHeight = (window.innerHeight || document.documentElement.clientHeight);
        const windowWidth = (window.innerWidth || document.documentElement.clientWidth);
        const vertInView = (canvasRect.top <= windowHeight) && ((canvasRect.top + canvasRect.height * 0.75) >= 0);
        const horInView = (canvasRect.left <= windowWidth) && ((canvasRect.left + canvasRect.width) >= 0);
        if (vertInView && horInView) {
            document.getElementById("page").textContent = `${Math.min(i + 1, pdfDoc.numPages)} / ${pdfDoc.numPages}`;
            break;
        }
    }
});

function highlightDraggedElement(element) {
    if (element.id.substring(0, 6) === "canvas") {
        element.style.opacity = "0.5";
    }
    else if (element === document.body) {
        document.body.style.backgroundColor = "rgb(72, 76, 79)";
    }
}

function revertDraggedElement(element) {
    if (element.id.substring(0, 6) === "canvas") {
        element.style.opacity = "1.0";
    }
    else if (element === document.body) {
        document.body.style.backgroundColor = "rgb(82, 86, 89)";
    }
}

document.body.addEventListener("dragenter", function (e) {
    e.preventDefault();
    highlightDraggedElement(e.target);
});

document.body.addEventListener("dragleave", function (e) {
    e.preventDefault();
    revertDraggedElement(e.target);
});

document.body.addEventListener("dragover", function (e) {
    e.preventDefault();
});

document.body.addEventListener("drop", function (e) {
    e.preventDefault();
    revertDraggedElement(e.target);
    const file = e.dataTransfer.files[0];
    uploadPDF(file);
});

pdfjsLib.getDocument(url).promise.then(function (pdfDoc_) {
    fileName = url.substring(url.lastIndexOf("/") + 1);
    renderAllPages(pdfDoc_);
});
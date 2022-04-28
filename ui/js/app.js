// Markup
const main = document.getElementById("main");
const container = document.querySelector(".xperience");
const inner = document.querySelector(".xperience-inner");
const [ rankA, rankB ] = [...container.querySelectorAll(".xperience-rank")];
const xpBar = container.querySelector(".xperience-progress");
const barA = container.querySelector(".xperience-indicator--bar");
const bar = container.querySelector(".xperience-progress--bar");
const counter = container.querySelector(".xperience-data");

// UI
let globalConfig = false;
let displayTimer = false;
let interval = 5000;
let initialised = false;

// Create XP bar segments
let segments = 10;
let rankbar = false;

// HELPER FUNCTIONS
function renderBar() {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < segments; i++) {
        const div = document.createElement("div");
        div.classList.add("xperience-segment");
        div.innerHTML = `<div class="xperiencem-indicator--bar"></div><div class="xperience-progress--bar"></div>`;

        frag.appendChild(div);
    }

    xpBar.appendChild(frag);
}

function fillSegments(pr, child) {
    const p = (segments / 100) * pr;
    const filled = Math.floor(p);
    const partial = p % 1;

    for (let i = 0; i < segments; i++) {
        if (i + 1 <= filled) {
            xpBar.children[i][child].style.width = "100%";
        } else {
            xpBar.children[i][child].style.width = "0%";
        }

        if (i + 1 === filled + 1) {
            xpBar.children[i][child].style.width = `${partial * 100}%`;
        }
    }
}

function TriggerRankChange(rank, prev, rankUp) {
    PostData("rankchange", {
        current: rank, previous: prev, rankUp: rankUp
    });
}

function UIOpen() {
    main.classList.add("active");
    window.clearTimeout(displayTimer);
}

function UITimeout() {
    UIOpen();

    displayTimer = window.setTimeout(() => {
        UIClose();
    }, globalConfig.timeout);
}

function UIClose() {
    main.classList.remove("active");
    window.clearTimeout(displayTimer);
    displayTimer = false;

    PostData("ui_closed");
}

function PostData(type = "", data = {}) {
    const resourceName = GetParentResourceName();

    fetch(`https://${resourceName}/${type}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify(data)
    }).then(resp => resp.json()).then(resp => resp).catch(error => console.log(`${resourceName} FETCH ERROR! ${error.message}`));    
}

window.onData = function (data) {
    if (data.init && !initialised) {
        globalConfig = {
            timeout: data.timeout,
            segments: data.segments,
            width: data.width,
        }

        let ranks = [];

        for ( let i = 0; i < data.ranks.length; i++ ) {
            ranks[i+1] = data.ranks[i];
        }

        // Class rankbar
        rankbar = new Xperience({
            xp: data.xp,
            ranks: ranks,

            // set initial XP / rank
            onInit: function (progress) {

                segments = data.segments

                // create segmented progress bar
                renderBar();

                inner.style.width = `${data.width}px`;

                // show the xp bar
                // UITimeout();        

                // fill to starting XP / rank
                fillSegments(progress, "lastElementChild");

                // Update rank indicators
                rankA.firstElementChild.textContent = this.currentRank;
                rankB.firstElementChild.textContent = this.nextRank;
		
                // Update XP counter
                counter.children[0].textContent = this.currentXP;
                counter.children[1].textContent = this.config.ranks[this.nextRank];

                // add new ranks
                rankA.classList.add(`xp-rank-${this.currentRank}`);
                rankB.classList.add(`xp-rank-${this.nextRank}`);                   

                initialised = true;

                PostData('ui_initialised')
            },
	
            onStart: function(add) {
                UIOpen();

                // make segments red if removing XP
                xpBar.classList.toggle("xperience-remove", !add);
            },

            // Update XP progress
            onChange: function (progress, xp, max, add) {
                main.classList.add("active");
                
                // update progress bar
                fillSegments(progress, "lastElementChild");
		
                // update indicator bar
                fillSegments(max, "firstElementChild");

                // update xp counter
                counter.children[0].textContent = xp;
            },

            // Update on rank change
            onRankChange: function (current, next, previous, add, max, rankUp) {

                // Fire rank change to update client UI
                TriggerRankChange(current, previous, rankUp)

                // Remove old ranks
                rankA.classList.remove(`xp-rank-${previous}`);
                rankB.classList.remove(`xp-rank-${current}`);
                rankB.classList.remove(`xperience-rank-${previous + 1}`);              
        
                // add new ranks
                rankA.classList.add(`xp-rank-${current}`);
                rankB.classList.add(`xp-rank-${next}`);                     

                counter.children[1].textContent = this.config.ranks[next];
		
                rankB.classList.add("pulse");
		
                fillSegments(0, "firstElementChild");
		
                window.setTimeout(() => {
                    rankB.classList.remove("pulse");
                    rankA.classList.add("spin");
                    rankA.classList.add("highlight");
                    rankB.classList.add("spin");
			
                    rankA.firstElementChild.textContent = current;
                    rankB.firstElementChild.textContent = next;		
			
                    window.setTimeout(() => {
                        rankA.classList.remove("spin");
                        rankA.classList.remove("highlight");
                        rankB.classList.remove("spin");
                        rankB.classList.remove("highlight");
                    }, 250);			
                }, 250);				
            },
	
            onEnd: function (add) {

                PostData('save', {
                    xp: this.currentXP,
                    rank: this.currentRank
                })

                // hide the xp bar
                UITimeout();

                xpBar.classList.remove("xperience-remove");
            }
        });
    }

    if ( initialised ) {
        // Set XP
        if (data.set) {
            rankbar.setXP(data.xp);
        }

        // Add XP
        if (data.add) {
            rankbar.addXP(data.xp);
        }

        // Remove XP
        if (data.remove) {
            rankbar.removeXP(data.xp);
        }    
    
        if (data.show) {
            UITimeout();
        } else if (data.hide) {
            UIClose();
        }
    }    
};

window.onload = function (e) {
    window.addEventListener('message', function (e) {
        onData(e.data);
    });
};
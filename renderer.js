const fetch = require('node-fetch');
const cheerio = require('cheerio');
const albumArt = require('album-art');

const searchInput = document.querySelector('#searchInput');
const songsList = document.querySelector('#songsList');
const player = document.querySelector('#player');
const playerSource = document.querySelector('#mp3Source');
const titlePlaying = document.querySelector('#titlePlaying');
const btnMore = document.querySelector('#btnMore');
const artCover = document.querySelector('#artCover');

const songs = [];
let currentlyPlaying,
    tableElement,
    page = 1;

searchInput.addEventListener('keyup', getSongs);

player.addEventListener('ended', () => {
    titlePlaying.innerHTML = "";

    // play next song
    let nextIndex = -1, i;
    for (i = 0; i < songs.length; i++) {
        if (currentlyPlaying.file_id === songs[i].file_id) {
            // check if last song => @todo load more
            nextIndex = ++i;
            break;
        }
    }
    if (nextIndex < songs.length) {
        const songsItems = Array.from(document.querySelectorAll('.songItem'));
        songsItems.forEach(song => {
            if (song.dataset.file_id === songs[nextIndex].file_id) {
                song.classList.add('hl');
            } else {
                song.classList.remove('hl');
            }
        });
        songs[nextIndex].play();
    }
});

player.addEventListener('pause', () => {
    // @todo : click to resume
});

btnMore.addEventListener('click', function () {
    page++;
    getSongs();
});

class Song {
    constructor(file_id, duration, singer, song, link) {
        this.file_id = file_id;
        this.duration = this.prettyPrintTime(duration);
        this.singer = singer;
        this.song = song;
        this.link = link;
    }

    /**
     *
     * @param time
     * @returns {string}
     */
    prettyPrintTime(time) {
        return (time - (time %= 60)) / 60 + (9 < time ? ':' : ':0') + time;
    }

    play() {
        const url = `http://pleer.net/site_api/files/get_url?action=download&id=${this.link}`;
        try {
            fetch(url)
                .then(blob => blob.json())
                .then(response => {
                    if (response.success === true && response.residue_type === "tracks") {
                        playerSource.src = response.track_link;
                        player.load();
                        player.play();

                        titlePlaying.innerHTML = `${this.song} - ${this.singer}`;
                        document.title = `${this.song} ${this.singer}` + " - Poor Man's Music";
                        try {
                            albumArt(this.singer, this.song, 'large', function (err, artUrl) {
                                artCover.classList.remove('hidden');
                                artCover.src = artUrl || 'img/no_album.jpg';
                            });
                        } catch (ex) {
                            console.log("Error getting the Artwork");
                        }
                    }
                });
        } catch (ex) {
            titlePlaying.innerHTML = "Something went wrong.."
        }
    }
}

function playSong(e) {
    const song_id = e.target.parentNode.dataset.file_id;
    tableElement = e.target.parentNode;

    if (currentlyPlaying != null && song_id === currentlyPlaying.file_id) return; // if already playing the song

    const songsItems = Array.from(document.querySelectorAll('.hl'));
    songsItems.forEach(song => song.classList.remove('hl'));

    const song = songs.filter(song => (song.file_id === song_id));
    currentlyPlaying = song[0];
    tableElement.classList.add('hl');

    song[0].play();
}

function displaySongsInList() {

    songsList.innerHTML = "Loading...";
    const html = songs.map(song => {
        return `<tr class="songItem" data-file_id="${song.file_id}">
            <td>${song.song}</td>
            <td>${song.singer}</td>
            <td>${song.duration}</td>
       </tr>`;
    }).join('');
    songsList.innerHTML = html;

    const songsItems = Array.from(document.querySelectorAll('.songItem'));
    songsItems.forEach(song => song.addEventListener('click', playSong));
}

function getSongs(e) {
    if (e != undefined) {
        if (e.keyCode !== 13) {
            return;
        }
        page = 1; // reset page at start

        while (songs.length) {
            songs.pop();
        }
        artCover.classList.add('hidden');
    }

    const query = searchInput.value;
    if (query < 2) {
        return;
    }

    fetch(encodeURI(`http://pleer.net/search?q=${query}&target=tracks&page=${page}`))
        .then(res => res.text()
        )
        .then(body => {
            $ = cheerio.load(body);
            const songsHTML = $('.scrolledPagination').find('li');

            songsHTML.map((key, value) => {
                songs.push(
                    new Song(
                        value.attribs.file_id,
                        value.attribs.duration,
                        value.attribs.singer,
                        value.attribs.song,
                        value.attribs.link)
                );
            });
            displaySongsInList();

            if (songs.length > 0) {
                btnMore.classList.remove('hidden');
            } else {
                btnMore.classList.add('hidden');
            }
        });
}

    const fileInput = document.getElementById("fileInput");
    const playlistDiv = document.getElementById("playlist");
    const audio = document.getElementById("audio");
    const currentSongTitle = document.getElementById("current-song");
    const volumeSlider = document.getElementById('volumeSlider');
    const progressBar = document.getElementById('progressBar');
    const deleteAllBtn = document.getElementById('deleteAllBtn');
    const currentTimeSpan = document.getElementById('current-time');
    const durationSpan = document.getElementById('duration');

    let playlist = [];
    let currentIndex = 0;

    // 📌 Cargar canciones guardadas en la BD al iniciar
    async function loadSongs() {
    try {
        const res = await fetch("/songs");
        const songs = await res.json();
        playlist = songs;
        renderPlaylist();
    } catch (err) {
        console.error("Error loading songs:", err);
    }
    }

    // 📌 Subir archivos al backend
    fileInput.addEventListener("change", async (e) => {
    const files = e.target.files;
    for (const file of files) {
        const formData = new FormData();
        formData.append("song", file);

        try {
        const res = await fetch("/upload", {
            method: "POST",
            body: formData,
        });

        if (!res.ok) {
            console.error("Error uploading file:", await res.text());
            continue;
        }

        const song = await res.json();
        playlist.push(song);
        } catch (err) {
        console.error("Error uploading song:", err);
        }
    }
    renderPlaylist();
    });

    // 📌 Renderizar la lista de canciones
    function renderPlaylist() {
    playlistDiv.innerHTML = "";
        playlist.forEach((song, index) => {
            const item = document.createElement("div");
            item.className = "song-item";
            if (index === currentIndex) {
                item.classList.add("playing");
            }

            const titleSpan = document.createElement("span");
            titleSpan.textContent = song.title;
            titleSpan.className = "song-title-text";
            titleSpan.onclick = () => playSong(index);

            const deleteBtn = document.createElement("button");
            deleteBtn.textContent = "🗑️";
            deleteBtn.className = "delete-song-btn";
            deleteBtn.title = "Eliminar canción";
            deleteBtn.onclick = (event) => {
                event.stopPropagation(); // Evita que se reproduzca la canción al hacer clic en eliminar
                deleteSong(index, song.id);
            };

            item.appendChild(titleSpan);
            item.appendChild(deleteBtn);
            playlistDiv.appendChild(item);
        });
    }

    // 📌 Reproducir una canción
    function playSong(index) {
    if (index < 0 || index >= playlist.length) return;

    currentIndex = index;
    audio.src = playlist[index].file_path;
    currentSongTitle.textContent = playlist[index].title;
    audio.play();
    renderPlaylist(); // Re-render para resaltar la canción actual
    }

    // 📌 Eliminar una canción
    async function deleteSong(index, songId) {
        // Pedir confirmación al usuario
        if (!confirm(`¿Estás seguro de que quieres eliminar "${playlist[index].title}"?`)) {
            return;
        }

        try {
            const response = await fetch(`/songs/${songId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Error en el servidor al eliminar la canción.');
            }

            console.log('Canción eliminada exitosamente');

            // Si la canción eliminada era la que se estaba reproduciendo
            if (index === currentIndex) {
                stopSong();
                currentSongTitle.textContent = "Selecciona una canción";
            }

            // Actualizar el array local y re-renderizar
            playlist.splice(index, 1);
            renderPlaylist();
        } catch (error) {
            console.error('Error al eliminar la canción:', error);
            alert('No se pudo eliminar la canción.');
        }
    }

    // 📌 Eliminar TODAS las canciones
    async function deleteAllSongs() {
        if (!confirm("¿Estás seguro de que quieres eliminar TODAS las canciones? Esta acción no se puede deshacer.")) {
            return;
        }

        try {
            const response = await fetch('/songs/all', {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Error en el servidor al eliminar las canciones.');
            }

            console.log('Todas las canciones han sido eliminadas.');
            
            // Limpiar la UI
            stopSong();
            currentSongTitle.textContent = "Selecciona una canción";
            playlist = [];
            renderPlaylist();
        } catch (error) {
            console.error('Error al eliminar todas las canciones:', error);
            alert('No se pudieron eliminar las canciones.');
        }
    }

    // 📌 Controles de navegación
    function nextSong() {
    if (playlist.length > 0) {
        playSong((currentIndex + 1) % playlist.length);
    }
    }

    function prevSong() {
    if (playlist.length > 0) {
        playSong((currentIndex - 1 + playlist.length) % playlist.length);
    }
    }

    // 📌 Pasar automáticamente a la siguiente canción cuando acabe
    audio.addEventListener("ended", () => {
    nextSong();
    });

    // 🕒 Función para formatear el tiempo de segundos a MM:SS
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    }

    function stopSong() {
        audio.pause();
        audio.currentTime = 0;
    }

    const volumeIcon = document.querySelector('.volume-icon');

// Cambiar volumen cuando se mueve el slider
volumeSlider.addEventListener('input', function() {
    // El valor del slider ahora es de 0 a 100. audio.volume es de 0.0 a 1.0
    audio.volume = this.value / 100; 
    
    // Cambiar ícono según el nivel de volumen
    if (this.value == 0) {
        volumeIcon.textContent = '🔇';
    } else if (this.value < 50) {
        volumeIcon.textContent = '🔉';
    } else {
        volumeIcon.textContent = '🔊';
    }
});

// Opcional: Silenciar/activar al hacer clic en el ícono
volumeIcon.addEventListener('click', function() {
    if (audio.volume > 0) {
        audio.volume = 0;
        volumeSlider.value = 0;
        volumeIcon.textContent = '🔇';
    } else {
        audio.volume = 1;
        volumeSlider.value = 100;
        volumeIcon.textContent = '🔊';
    }
});

    // 🎶 Barra de progreso
    audio.addEventListener('timeupdate', () => {
        if (audio.duration) {
            // Actualizar barra de progreso
            progressBar.value = (audio.currentTime / audio.duration) * 100;
            // Actualizar tiempo actual
            currentTimeSpan.textContent = formatTime(audio.currentTime);
        }
    });

    // 🎶 Mostrar duración total cuando la canción se carga
    audio.addEventListener('loadedmetadata', () => {
        durationSpan.textContent = formatTime(audio.duration);
    });

    progressBar.addEventListener('input', function() {
        audio.currentTime = (this.value / 100) * audio.duration;
    });

    // Inicializar
    deleteAllBtn.addEventListener('click', deleteAllSongs);
    loadSongs();

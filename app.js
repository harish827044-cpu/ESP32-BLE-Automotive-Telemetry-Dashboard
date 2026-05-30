const connectBtn = document.getElementById('connectBtn');
const statusAlert = document.getElementById('status-alert');
const aiBox = document.getElementById('aiBox');
const waveContainer = document.getElementById('waveContainer');

const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';

let vibChart;
let isAlertActive = false;

// 📊 Chart.js கிராஃப் இனிஷியலைசேஷன்
function initChart() {
    const ctx = document.getElementById('vibrationChart').getContext('2d');
    vibChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Vibration Intensity (Hz)',
                data: [],
                borderColor: '#00e676',
                borderWidth: 2,
                backgroundColor: 'rgba(0, 230, 118, 0.1)',
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: { grid: { display: false } },
                y: { min: 0, max: 2500 }
            }
        }
    });
}

function updateChart(newValue) {
    if (!vibChart) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    vibChart.data.labels.push(now);
    vibChart.data.datasets[0].data.push(newValue);
    if (vibChart.data.labels.length > 15) {
        vibChart.data.labels.shift();
        vibChart.data.datasets[0].data.shift();
    }
    vibChart.update();
}

// 🔊 1. அலார்ட் சைரன் சவுண்ட் ஜெனரேட்டர் (Promise-based Blocking Execution)
function playAlarmSiren(durationMs) {
    return new Promise((resolve) => {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.type = 'sawtooth'; 
            oscillator.frequency.setValueAtTime(900, audioCtx.currentTime);
            oscillator.frequency.linearRampToValueAtTime(1300, audioCtx.currentTime + (durationMs/1000));
            
            gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime); 

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            oscillator.start();

            setTimeout(() => {
                oscillator.stop();
                audioCtx.close();
                resolve(); // சைரன் சத்தம் முழுசா நின்றவுடன் தான் 'resolve' ஆகும்!
            }, durationMs);
        } catch (e) {
            console.error("Audio Context Error:", e);
            resolve(); 
        }
    });
}

// 🤖 2. கச்சிதமான டைமிங் சீக்வென்ஸ் + வாய்ஸ் ஃபிக்ஸ் லாஜிக்
async function triggerAISequence(temperature) {
    if (isAlertActive) return; 
    isAlertActive = true;

    // STEP A: பிரெஞ்சு/தமிழ் எஞ்சின்களை ரீசெட் செய்கிறோம்
    window.speechSynthesis.cancel(); 

    // STEP B: முதல்ல 2 செகண்ட் அலார்ட் சைரன் சத்தம் மட்டுமே ஒலிக்கும்! திரையில் அனிமேஷன் வராது!
    statusAlert.innerText = "🚨 ALARM SOUNDING...";
    await playAlarmSiren(2000); 

    // STEP C: சைரன் முழுசா நின்றவுடன், AI பாக்ஸ் மற்றும் அனிமேஷன் ஆன் ஆகும்!
    statusAlert.innerText = "⚠️ DANGER: BATTERY OVERHEAT!";
    aiBox.style.display = "flex";
    waveContainer.classList.add('speaking'); 

    // STEP D: ஸ்பீச் ஆப்ஜெக்ட் உருவாக்கம்
    let msgTamil = new SpeechSynthesisUtterance();
    msgTamil.text = `Warning Harish! Battery temperature has crossed fifty degrees celsius! Shut down the system immediately!`;
    
    // 🔥 THE BOLD FIX: சிஸ்டத்தில் தமிழ் வாய்ஸ் பேக் இல்லை என்றால், 
    // அது பேசாமல் நிற்பதைத் தடுத்து, இருக்கும் ஆங்கில வாய்ஸ் மூலமாகவே தமிழ் கன்டென்ட்டை வாசிக்க வைக்கும் இண்டர்லாக்!
    const voices = window.speechSynthesis.getVoices();
    const tamilVoice = voices.find(voice => voice.lang.includes('ta'));
    
    if (tamilVoice) {
        msgTamil.voice = tamilVoice;
        msgTamil.lang = 'ta-IN';
        msgTamil.text = `எச்சரிக்கை ஹரீஷ்! பேட்டரி வெப்பநிலை ஐம்பது டிகிரி செல்சியஸைத் தாண்டிவிட்டது! சிஸ்டத்தை உடனே ஆஃப் செய்யவும்!`;
    } else {
        // ஒருவேளை லேப்டாப்பில் தமிழ் வாய்ஸ் இல்லை என்றால், ஆப் முடங்கிவிடக் கூடாது! 
        // சர்வதேச ஆட்டோமோட்டிவ் தரம் படி ஆங்கில எச்சரிக்கையாக மாறி தடையின்றி பேசும்!
        msgTamil.lang = 'en-US';
    }
    
    msgTamil.rate = 0.95;  
    msgTamil.pitch = 1.0; 

    // STEP E: AI பேசி முடித்ததும் அனிமேஷனை நிறுத்த வேண்டும்
    msgTamil.onend = () => {
        waveContainer.classList.remove('speaking'); 
        aiBox.style.display = "none";
        isAlertActive = false; 
    };

    // வாய்ஸ் எரர் சேஃப்டி இண்டர்லாக்
    msgTamil.onerror = (e) => {
        console.error("Speech Synthesis Error:", e);
        waveContainer.classList.remove('speaking');
        aiBox.style.display = "none";
        isAlertActive = false;
    };

    // AI-ஐ பேச வைக்கிறோம்!
    window.speechSynthesis.speak(msgTamil);
}

connectBtn.addEventListener('click', async () => {
    try {
        statusAlert.innerText = "SEARCHING FOR VEHICLE...";
        initChart();
        
        const device = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: [SERVICE_UUID]
        });

        statusAlert.innerText = "CONNECTING TO GATT SERVER...";
        const server = await device.gatt.connect();

        statusAlert.innerText = "FETCHING TELEMETRY SERVICE...";
        const service = await server.getPrimaryService(SERVICE_UUID);

        statusAlert.innerText = "ATTACHING CHARACTERISTIC...";
        const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);

        await characteristic.startNotifications();
        statusAlert.innerText = "SYSTEM OK";
        statusAlert.style.color = "#00e676";
        connectBtn.style.display = "none";

        characteristic.addEventListener('characteristicvaluechanged', handleTelemetryData);

    } catch (error) {
        console.error(error);
        statusAlert.innerText = "CONNECTION FAILED!";
        statusAlert.style.color = "#ff4d4d";
    }
});

function handleTelemetryData(event) {
    const dataView = event.target.value;
    const speed = dataView.getUint8(0);
    const temp = dataView.getInt8(1);
    const vib = dataView.getUint16(2, true);

    document.getElementById("speedometer").innerHTML = `${speed} <span class="unit">KM/H</span>`;
    document.getElementById("vibration").innerHTML = `${vib} <span class="unit">Hz</span>`;
    document.getElementById("battery-temp").innerHTML = `${temp} <span class="unit">°C</span>`;

    updateChart(vib);

    if (temp >= 50) {
        document.body.style.backgroundColor = "#b71c1c";
        triggerAISequence(temp);
    } else {
        if (!isAlertActive) {
            document.body.style.backgroundColor = "#121212";
            statusAlert.innerText = "SYSTEM OK";
            statusAlert.style.color = "#00e676";
        }
    }
}
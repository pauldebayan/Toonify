const imageUpload = document.getElementById('imageUpload');
    const canvas = document.getElementById("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });

    const callSession = async function(){
      window.session = await ort.InferenceSession.create('gen.onnx');
      document.getElementById("upload-image").disabled = false;
      document.getElementById("upload-image").innerText = "Upload Image";
    }

    callSession();

    function normalizeImageData_Tensor(imageData) {
      const { data, width, height } = imageData;
      const tensorData = new Float32Array(width * height * 3);

      const mean = 0.5;
      const std = 0.5;

      for (let i = 0; i < width * height; i++) {
        // Normalize each channel to [-1, 1] range
        tensorData[i] = (data[i * 4] / 255 - 0.5) / 0.5; // R
        tensorData[i + width * height] = (data[i * 4 + 1] / 255 - 0.5) / 0.5; // G
        tensorData[i + 2 * width * height] = (data[i * 4 + 2] / 255 - 0.5) / 0.5; // B
      }

      const tensor = new ort.Tensor('float32', tensorData, [1, 3, height, width]);

      return tensor;
    }


    async function drawToCanvas() {

      const imageData = context.getImageData(0, 0, 512, 512);

      imageDataTensor = normalizeImageData_Tensor(imageData)

      const feeds = { "input":  imageDataTensor};

      await window.session.run(feeds).then(data => {

        let f32a = data[116].cpuData;

        const uint8ClampedArray = new Uint8ClampedArray(512 * 512 * 4);
        for (let i = 0; i < 512; i++) {
          for (let j = 0; j < 512; j++) {
            for (let k = 0; k < 3; k++) {
              const idx = (i * 512 * 4) + (j * 4) + k;
              const f32aIdx = (k * 512 * 512) + (i * 512) + j;
              uint8ClampedArray[idx] = Math.min(255, Math.max(0, f32a[f32aIdx] * 255));
            }
            uint8ClampedArray[(i * 512 * 4) + (j * 4) + 3] = 255;
          }
        }

        const imageData = new ImageData(uint8ClampedArray, canvas.width, canvas.height);

        context.clearRect(0, 0, canvas.width, canvas.height);
        context.putImageData(imageData, 0, 0);
        
        // Watermark
        context.font = 'bold 20px Arial';
        context.fillStyle = 'rgba(255, 255, 255, 0.5)';
        context.textAlign = 'center'; 
        context.textBaseline = 'middle';
        context.fillText('toon-ify.web.app', canvas.width / 2, canvas.height / 2); // Adjust position as needed
        
        
      });
      
    }
    
    imageUpload.addEventListener('change', function(event) {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
          const img = new Image();
          img.onload = function() {

            const aspectRatio = img.width / img.height;
            let newWidth, newHeight;
            
            if (img.width > img.height) {
                newWidth = 512;
                newHeight = 512 / aspectRatio;
            } else {
                newHeight = 512;
                newWidth = 512 * aspectRatio;
            }

            const x = (canvas.width - newWidth) / 2;
            const y = (canvas.height - newHeight) / 2;
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.drawImage(img, x, y, newWidth, newHeight);

            setTimeout(function() {
                drawToCanvas()
                document.getElementById("download-image").style.display = "block";
            }, 1000); 
        
          };
          img.src = e.target.result;
        };
        
        reader.readAsDataURL(file);
      }
      
    });

    function uploadButton(){
        document.getElementById("download-image").style.display = "none";
        imageUpload.click();
    };

    function downloadImage(){
        const dataUrl = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = "toonify.png";
        a.click();
    }
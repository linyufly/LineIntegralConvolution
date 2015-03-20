// Modified from the base code from CS519 Visualization (Spring 2015).

var x_extent=[-1.0, 1.0];
var y_extent=[-1.0, 1.0];
var dx = 0.0001;
var dy = 0.0001;

var scalar_func = gaussian;

function main() {
  // Check for the various File API support.
  if (window.File && window.FileReader && window.FileList && window.Blob) {
    // Great success! All the File APIs are supported.
  } else {
    alert('The File APIs are not fully supported in this browser.');
  }

  render();
}

function gaussian_1d(x) {
  return Math.exp(-x * x);
}

function outside(pt, width, height) {
  return pt[0] < 0 || pt[1] < 0 || pt[0] >= width || pt[1] >= height;
}

function general_gradient(pt) {
  return [(scalar_func([pt[0] + dx, pt[1]]) - scalar_func([pt[0] - dx, pt[1]])) / (2 * dx),
          (scalar_func([pt[0], pt[1] + dy]) - scalar_func([pt[0], pt[1] - dy])) / (2 * dy)];
}

function render(canvas){
  var canvas = document.getElementById('example');
  if (!canvas) {
    console.log('Failed to retrieve the <canvas> element');
    return false;
  } else {
    console.log(' Got < canvas > element ');
  }

  var canvas_noise = document.getElementById('noise');
  var ctx_noise = canvas_noise.getContext('2d');

  var canvas_convolution = document.getElementById('convolution');
  var ctx_convolution = canvas_convolution.getContext('2d');

  // Get the rendering context for 2DCG <- (2)
  var ctx = canvas.getContext('2d');

  // Draw the scalar data using an image rpresentation
  var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  //Determine the data range...useful for the color mapping
  var gradient_func = gaussian_gradient;

  if (document.getElementById("divergence").checked) {
    scalar_func = gaussian_divergence;
    gradient_func = general_gradient;
  }

  var mn = scalar_func(pixel2pt(canvas.width, canvas.height, x_extent, y_extent, 0, 0));
  var mx = mn;
  for (var y = 0; y < canvas.height; y++) {
    for (var x = 0; x < canvas.width; x++) {
      var fval = scalar_func(pixel2pt(canvas.width, canvas.height, x_extent, y_extent, x, y));
      if (fval < mn) {
        mn = fval;
      }
      if (fval > mx) {
        mx = fval;
      }
    }
  }

  // Set the colormap based in the radio button
  var color_func = rainbow_colormap;
  if (document.getElementById("greyscale").checked) {
    color_func = greyscale_map;
  }

  //Color the domain according to the scalar value
  for (var y = 0; y < canvas.height; y++) {
    for (var x = 0; x < canvas.width; x++) {
      var fval = scalar_func(pixel2pt(canvas.width, canvas.height, x_extent, y_extent, x, y));
      var color = color_func(fval, mn, mx);

      i = (y * canvas.width + x) * 4

      imgData.data[i] = color[0];
      imgData.data[i + 1] = color[1];
      imgData.data[i + 2] = color[2];
      imgData.data[i + 3] = color[3];
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // Draw the noisy data using an image rpresentation
  var noises = [];
  for (var x = 0; x < canvas.width; x++) {
    var noise_list = [];
    for (var y = 0; y < canvas.height; y++) {
      noise_list.push(Math.random());
    }
    noises.push(noise_list);
  }

  var noise_image = ctx_noise.getImageData(0, 0, canvas_noise.width, canvas_noise.height);
  for (var x = 0; x < canvas_noise.width; x++) {
    for (var y = 0; y < canvas_noise.height; y++) {
      var fval = noises[x][y];
      var color = color_func(fval, 0.0, 1.0);

      i = (y * canvas_noise.width + x) * 4;
      noise_image.data[i] = color[0];
      noise_image.data[i + 1] = color[1];
      noise_image.data[i + 2] = color[2];
      noise_image.data[i + 3] = color[3];
    }
  }

  ctx_noise.putImageData(noise_image, 0, 0);

  var convolution_image = ctx_convolution.getImageData(0, 0, canvas_convolution.width, canvas_convolution.height);
  var ds = parseFloat(document.getElementById("tracing_step").value);
  var l = parseFloat(document.getElementById("tracing_length").value);
  var convolution = [];

  var max_convolution = 0;
  var min_convolution = l * 2;

  for (var x = 0; x < canvas_convolution.width; x++) {
    var convolution_list = [];
    for (var y = 0; y < canvas_convolution.height; y++) {
      var start_pt = pixel2pt(canvas_convolution.width, canvas_convolution.height, x_extent, y_extent, x, y);
      var curr_pt = [start_pt[0], start_pt[1]];
      var sum = 0.0;
      var weight = 0.0;
      for (var s = 0.0; s <= l; s += ds) {
        pixel = pt2pixel(canvas_convolution.width, canvas_convolution.height, x_extent, y_extent, curr_pt[0], curr_pt[1]);
        if (outside(pixel, canvas_convolution.width, canvas_convolution.height)) {
          break;
        }
        sum += noises[pixel[0]][pixel[1]] * ds * gaussian_1d(s);
        weight += ds * gaussian_1d(s);
        direction = normalize2D(gradient_func(curr_pt));
        curr_pt[0] += direction[0] * ds;
        curr_pt[1] += direction[1] * ds;
      }
      curr_pt = [start_pt[0], start_pt[1]];
      for (var s = 0.0; s <= l; s += ds) {
        pixel = pt2pixel(canvas_convolution.width, canvas_convolution.height, x_extent, y_extent, curr_pt[0], curr_pt[1]);
        if (outside(pixel, canvas_convolution.width, canvas_convolution.height)) {
          break;
        }
        if (s > 0.0) {
          sum += noises[pixel[0]][pixel[1]] * ds * gaussian_1d(s);
          weight += ds * gaussian_1d(s);
        }
        direction = normalize2D(gradient_func(curr_pt));
        curr_pt[0] -= direction[0] * ds;
        curr_pt[1] -= direction[1] * ds;
      }

      sum /= weight;

      if (sum < min_convolution) {
        min_convolution = sum;
      }
      if (sum > max_convolution) {
        max_convolution = sum;
      }
      convolution_list.push(sum);
    }
    convolution.push(convolution_list);
  }

  var convolution_image = ctx_convolution.getImageData(0, 0, canvas_convolution.width, canvas_convolution.height);
  for (var x = 0; x < canvas_convolution.width; x++) {
    for (var y = 0; y < canvas_convolution.height; y++) {
      var fval = convolution[x][y];
      var color = color_func(fval, min_convolution, max_convolution);

      i = (y * canvas_convolution.width + x) * 4;
      convolution_image.data[i] = color[0];
      convolution_image.data[i + 1] = color[1];
      convolution_image.data[i + 2] = color[2];
      convolution_image.data[i + 3] = color[3];
    }
  }

  ctx_convolution.putImageData(convolution_image, 0, 0);
}

//--------------------------------------------------------
// Map a point in pixel coordinates to the 2D function domain
function pixel2pt(width,height,x_extent,y_extent, p_x,p_y){
	var pt = [0,0];
	xlen=x_extent[1]-x_extent[0]
	ylen=y_extent[1]-y_extent[0]
	pt[0]=(p_x/width)*xlen + x_extent[0];
	pt[1]=(p_y/height)*ylen + y_extent[0];
	return pt;
	}

//--------------------------------------------------------
// Map a point in domain coordinates to pixel coordinates
function pt2pixel(width,height,x_extent,y_extent, p_x,p_y){
	var pt = [0,0];

	var xlen = (p_x-x_extent[0])/(x_extent[1]-x_extent[0]);
  var ylen = (p_y-y_extent[0])/(y_extent[1]-y_extent[0]);

	pt[0]=Math.round(xlen*width);
	pt[1]=Math.round(ylen*height);
	return pt;
	}

//--------------------------------------------------------
// Draw randomly seeded stremalines

function draw_streamlines(canvas,ctx,num){
  for(var i=0;i<num;i++)
    {
    //Generate random seed
    var x = (2.0*Math.random())-1.0;
    var y = (2.0*Math.random())-1.0;
    var h = 5.0*(x_extent[1]-x_extent[0])/canvas.width;
    var steps = 20.0
    var linpts = euler_integration([x,y],h,steps,gaussian_gradient);

    //draw the line
     var pt = linpts[0];
     var pix = pt2pixel(canvas.width,canvas.height,x_extent,y_extent,pt[0],pt[1]);
     ctx.beginPath();
     ctx.moveTo(pix[0], pix[1]);
     for(var j=1;j<linpts.length;j++){
         pt = linpts[j];
         pixdest = pt2pixel(canvas.width,canvas.height,x_extent,y_extent,pt[0],pt[1]);
	       ctx.lineTo(pixdest[0],pixdest[1]);
         ctx.lineWidth = 1;
         ctx.strokeStyle = '#FFFFFF';
         ctx.stroke();
       }
    }
}


/* ========================================
   CALCULATOR FUNCTIONS
   ======================================== */

/* Utility: format key to title case */
function fmtKey(k) { 
  return k.replace(/_/g, ' ').replace(/\b\w/g, m => m.toUpperCase()); 
}

/* Render result object to a container */
function renderResult(container, obj) {
  if (!container) return;
  
  if (typeof obj === 'string') {
    container.innerHTML = '<div class="result-box">' + obj + '</div>';
    return;
  }
  
  let html = '<div class="result-box">';
  for (const key in obj) {
    html += '<div class="result-line">' +
            '<div class="result-label">' + fmtKey(key) + ':</div>' +
            '<div class="result-value">' + obj[key] + '</div>' +
            '</div>';
  }
  html += '</div>';
  container.innerHTML = html;
}

/* Generic form handler for form.calc elements */
document.addEventListener('click', function(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  
  const form = btn.closest('form.calc');
  if (!form) return;
  
  const action = btn.getAttribute('data-action');
  const resultArea = form.querySelector('[data-result]');
  
  if (action === 'clear') {
    form.reset();
    if (resultArea) resultArea.innerHTML = '—';
    return;
  }
  
  if (action === 'compute') {
    const id = form.getAttribute('data-id');
    if (!id) { 
      renderResult(resultArea, 'Calculator id missing'); 
      return; 
    }
    
    const values = {};
    for (const el of form.elements) { 
      if (!el.name) continue; 
      const v = el.value.trim(); 
      values[el.name] = v === '' ? NaN : parseFloat(v); 
    }
    
    try {
      if (window.calcMap && typeof window.calcMap[id] === 'function') {
        const res = window.calcMap[id](values);
        renderResult(resultArea, res);
      } else {
        renderResult(resultArea, 'Calculator not implemented');
      }
    } catch (err) {
      renderResult(resultArea, 'Error: ' + err);
    }
  }
}, false);

/* Inline helpers exposed for standalone sections */
function convertTireString(s) {
  s = (s || '').trim().toUpperCase();
  const m = s.match(/(\d{3})\/(\d{2,3})R(\d{2})/);
  
  if (!m) return { error: 'Please enter a valid tire size (e.g. 275/60R15)' };
  
  const width = parseFloat(m[1]);
  const aspect = parseFloat(m[2]);
  const rim = parseFloat(m[3]);
  const sidewall = (width * (aspect / 100)) / 25.4;
  const overall = rim + sidewall * 2;
  const circ = Math.PI * overall;
  
  return { 
    section_width_in: (width / 25.4).toFixed(2) + ' in', 
    sidewall_height_in: sidewall.toFixed(2) + ' in', 
    overall_diameter_in: overall.toFixed(2) + ' in', 
    circumference_in: circ.toFixed(2) + ' in' 
  };
}

function calculateMPGInline(vals) {
  const sG = parseFloat(vals.stockGear);
  const nG = parseFloat(vals.newGear);
  const sT = parseFloat(vals.stockTire);
  const nT = parseFloat(vals.newTire);
  const miles = parseFloat(vals.milesDriven);
  const gallons = parseFloat(vals.gallonsUsed);
  
  if ([sG, nG, sT, nT, miles, gallons].some(v => isNaN(v))) {
    return { error: 'Please fill in all fields with valid numbers.' };
  }
  
  const displayed = miles / gallons;
  const corr = (nT * sG) / (sT * nG);
  const trueMPG = displayed * corr;
  
  return { 
    correction_factor_percent: (corr * 100).toFixed(1) + '%', 
    adjusted_true_mpg: trueMPG.toFixed(2) + ' MPG' 
  };
}

/* calcMap: functions for form-based calculators */
window.calcMap = {};

/* Fuel & Performance */
window.calcMap['std_mpg'] = function(vals) {
  if (isNaN(vals.miles) || isNaN(vals.gallons) || vals.gallons === 0) {
    return { error: 'Enter miles and gallons (gallons ≠ 0).' };
  }
  return { mpg: (vals.miles / vals.gallons).toFixed(2) + ' MPG' };
};

window.calcMap['hp_from_torque'] = function(vals) {
  if (isNaN(vals.torque) || isNaN(vals.rpm)) {
    return { error: 'Enter torque and rpm.' };
  }
  return { horsepower: ((vals.torque * vals.rpm) / 5252).toFixed(1) + ' HP' };
};

window.calcMap['torque_from_hp'] = function(vals) {
  if (isNaN(vals.hp) || isNaN(vals.rpm)) {
    return { error: 'Enter horsepower and rpm.' };
  }
  return { torque_lb_ft: ((vals.hp * 5252) / vals.rpm).toFixed(1) + ' lb-ft' };
};

window.calcMap['quarter_mile_et'] = function(vals) {
  if (isNaN(vals.weight) || isNaN(vals.hp) || vals.hp <= 0) {
    return { error: 'Enter weight and horsepower.' };
  }
  return { estimated_et_s: (5.825 * Math.pow(vals.weight / vals.hp, 1/3)).toFixed(2) + ' s' };
};

/* Engine */
window.calcMap['displacement'] = function(vals) {
  if (isNaN(vals.bore) || isNaN(vals.stroke) || isNaN(vals.cyl)) {
    return { error: 'Enter bore, stroke, cylinders.' };
  }
  const area = Math.PI * Math.pow(vals.bore / 2, 2);
  const cuin = area * vals.stroke * vals.cyl;
  const liters = cuin * 0.0163871;
  return { 
    cu_in: cuin.toFixed(2) + ' ci', 
    liters: liters.toFixed(2) + ' L' 
  };
};

window.calcMap['compression_ratio'] = function(vals) {
  if (isNaN(vals.swept) || isNaN(vals.clearance) || vals.clearance <= 0) {
    return { error: 'Enter swept and clearance volumes.' };
  }
  const cr = (vals.swept + vals.clearance) / vals.clearance;
  return { compression_ratio: cr.toFixed(2) + ':1' };
};

window.calcMap['piston_speed'] = function(vals) {
  if (isNaN(vals.stroke) || isNaN(vals.rpm)) {
    return { error: 'Enter stroke and rpm.' };
  }
  const ft_per_min = 2 * vals.stroke * vals.rpm / 12;
  const m_per_s = ft_per_min * 0.00508;
  return { 
    piston_speed_ft_per_min: Math.round(ft_per_min) + ' ft/min', 
    piston_speed_m_per_s: m_per_s.toFixed(2) + ' m/s' 
  };
};

/* Tire & drivetrain */
window.calcMap['rpm_from_speed'] = function(vals) {
  if (isNaN(vals.speed) || isNaN(vals.gear) || isNaN(vals.final) || isNaN(vals.tire)) {
    return { error: 'Enter speed, gear, final drive, tire diameter.' };
  }
  const revPerMile = 63360 / (Math.PI * vals.tire);
  const wheelRPM = vals.speed * revPerMile / 60;
  const engineRPM = Math.round(wheelRPM * vals.gear * vals.final);
  return { engine_rpm: engineRPM + ' RPM' };
};

window.calcMap['speedo_correction'] = function(vals) {
  if (isNaN(vals.old) || isNaN(vals.new) || isNaN(vals.indicated)) {
    return { error: 'Enter old, new diameters and indicated speed.' };
  }
  const trueSpeed = vals.indicated * (vals.new / vals.old);
  const pct = (vals.new - vals.old) / vals.old * 100;
  return { 
    true_speed_mph: trueSpeed.toFixed(1) + ' MPH', 
    percent_change: pct.toFixed(2) + ' %' 
  };
};

/* Fabrication */
window.calcMap['injector_size'] = function(vals) {
  if (isNaN(vals.hp) || isNaN(vals.cyl) || isNaN(vals.bsfc) || isNaN(vals.duty)) {
    return { error: 'Enter hp, cylinders, bsfc, duty.' };
  }
  const inj = (vals.hp * vals.bsfc) / (vals.cyl * (vals.duty / 100));
  return { injector_lb_hr: inj.toFixed(1) + ' lb/hr' };
};

window.calcMap['airflow_cfm'] = function(vals) {
  if (isNaN(vals.hp)) {
    return { error: 'Enter horsepower.' };
  }
  return { airflow_cfm: Math.round(vals.hp * 0.5) + ' CFM (est.)' };
};


/* ========================================
   MOBILE HAMBURGER MENU
   ======================================== */

document.addEventListener('DOMContentLoaded', function() {
  const hamburger = document.querySelector('.hamburger');
  const nav = document.querySelector('.nav');
  
  if (!hamburger || !nav) {
    console.log('Hamburger or nav not found');
    return;
  }
  
  console.log('Mobile menu initialized');
  
  // Toggle mobile menu when hamburger is clicked
  hamburger.addEventListener('click', function(e) {
    e.stopPropagation();
    console.log('Hamburger clicked');
    this.classList.toggle('active');
    nav.classList.toggle('active');
    // Prevent body scroll when menu is open
    document.body.style.overflow = nav.classList.contains('active') ? 'hidden' : '';
  });
  
  // Handle dropdown clicks on mobile (expand calculator submenu)
  const dropdowns = document.querySelectorAll('.dropdown > a');
  dropdowns.forEach(dropdown => {
    dropdown.addEventListener('click', function(e) {
      // Only on mobile screens
      if (window.innerWidth <= 900) {
        // Check if this is the Calculators dropdown (has submenu)
        const dropdownContent = this.nextElementSibling;
        if (dropdownContent && dropdownContent.classList.contains('dropdown-content')) {
          e.preventDefault(); // Don't navigate, just expand
          dropdownContent.classList.toggle('active');
          console.log('Dropdown toggled');
        }
      }
    });
  });
  
  // Close menu when clicking a calculator link
  const calculatorLinks = document.querySelectorAll('.dropdown-content a');
  calculatorLinks.forEach(link => {
    link.addEventListener('click', function() {
      if (window.innerWidth <= 900) {
        hamburger.classList.remove('active');
        nav.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  });
  
  // Close menu when clicking outside
  document.addEventListener('click', function(e) {
    if (window.innerWidth <= 900) {
      if (nav.classList.contains('active') && 
          !nav.contains(e.target) && 
          !hamburger.contains(e.target)) {
        hamburger.classList.remove('active');
        nav.classList.remove('active');
        document.body.style.overflow = '';
      }
    }
  });
  
  // Close menu on window resize
  window.addEventListener('resize', function() {
    if (window.innerWidth > 900) {
      if (hamburger) hamburger.classList.remove('active');
      if (nav) nav.classList.remove('active');
      document.body.style.overflow = '';
      
      // Close any open dropdowns
      document.querySelectorAll('.dropdown-content.active').forEach(dropdown => {
        dropdown.classList.remove('active');
      });
    }
  });
});

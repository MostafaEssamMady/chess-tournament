// حارس الإطارات (frame-buster): يمنع عرض الموقع داخل إطار في صفحة أخرى (هجوم النقر المخادع Clickjacking).
// الاستضافات التي لا تسمح بترويسات HTTP (مثل GitHub Pages) لا تستطيع إرسال frame-ancestors،
// فنفعل ذلك هنا: إن كنا داخل إطار نُخفي الصفحة كليًا ونحاول الخروج منه. (لا يؤثر في فتح الموقع عادة.)
(function () {
  'use strict';
  try {
    if (window.top === window.self) return;
  } catch (e) { /* الوصول إلى top ممنوع = نحن داخل إطار من أصل آخر */ }
  window.CT_FRAMED = true;
  document.documentElement.style.display = 'none';
  try { window.top.location.replace(window.self.location.href); } catch (e) { /* إطار محمي بـ sandbox: تبقى الصفحة مخفية */ }
})();

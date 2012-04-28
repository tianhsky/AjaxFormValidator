/*
 * AjaxFormValidator
 * Copyright 2012 Tianyu Huang
 * tianhsky@yahoo.com
 *
 * Version 1.0.1
 *
 * A plugin written in JavaScript to handle form submissions and automatically render messages returned in JSON for each input element.
 * This plugin requires jQuery.
 * 
 */


/* 
examples:
<div id="form_group1">
<input fg="form_group1" name="field1"/>
<button fg="form_group1" ft="submit"> Submit </button>
</div>

<script>
AjaxFormValidator("/xxx/xx",
{
form_wrapper: $("#form_group1"),
form_group: "form_group1",
success_fun: function (resp) { },
error_fun: function (resp) { }
});
</script>
*/

$J = jQuery != null ? jQuery : null; //to avoid $ alias conflict with other lib
var AjaxFormValidator = function (url, options) {

    // Default options
    var defaults = {
        url: null, //required: where request sends to
        fields: null, //required: either this or form_group is required, list of form fields in jQuery
        form_group: null, //required: either this or fields is required, unique form group id
        submits: null, //optional: list of submit buttons in jQuery
        form_wrapper: null, //optional: outer wrapper element of the form in jQuery
        submit_interval: 100, //optional: interval between each submit event

        before_submit_fun: null,
        success_fun: function (resp) {
        }, //optional: customized add-on function for success post back
        error_fun: function (xhr, ajaxOptions, thrownError) {
        }, //optional: customized add-on function for error post back
        simulate_postback_json: null, //optional: without server side code written, just want to see how it renders the json
        shake_when_error: true, //form will shake when postback indicates any unsuccess

        show_loading: true, //optional: show loading status when ajax is sending/receiving
        postback_update: false, //optional: update form fields with data returned from server
        allow_submit: true, //optional: allow enter or button click to submit form

        feedback_display_position: "after", //optional: "before" or "after" the original field position
        feedback_css_class: "feedback_css_class", //optional: the css class for all feedback div elements
        error_css_class: "error_css_class", //optional: the css class for displaying error feedback message
        warning_css_class: "warning_css_class", //optional: the css class for displaying warning feedback message
        success_css_class: "success_css_class", //optional: the css class for displaying success feedback message
        loading_css_class: "loading_css_class", //optional: the css class for displaying loading message

        loading_spinner_opts: {
            lines: 17, // The number of lines to draw
            length: 30, // The length of each line
            width: 20, // The line thickness
            radius: 8, // The radius of the inner circle
            rotate: 17, // The rotation offset
            color: '#012', // #rgb or #rrggbb
            speed: 1, // Rounds per second
            trail: 70, // Afterglow percentage
            shadow: false, // Whether to render a shadow
            hwaccel: true, // Whether to use hardware acceleration
            className: 'spinner', // The CSS class to assign to the spinner
            zIndex: 2e9, // The z-index (defaults to 2000000000)
            top: 'auto', // Top position relative to parent in px
            left: 'auto' // Left position relative to parent in px
        },

        start: function () {
        }
    };
    // Combine customized options with default options
    var opts = $J.extend(defaults, options);

    //################################################################

    // Verify settings
    var form_group_items = $J("[fg=" + opts.form_group + "]");
    var has_fields = (opts.fields != null);
    var has_buttons = (opts.submits != null);
    if (form_group_items.length > 0 && (has_fields || has_buttons)) {
        throw ("AjaxFormValidator: Can only specify either (form_group) or (fields and submits), but not both!");
    }

    // Define button event
    if (opts.form_group != null || opts.form_group.length > 0) {
        opts.submits = [];
        all_buttons = $J("[fg=" + opts.form_group + "][ft=submit]");
        for (var i = 0; i < all_buttons.length; i++) {
            var b = $J(all_buttons[i]);
            opts.submits.push(b);
        }
    }
    for (var i in opts.submits) {
        var s = opts.submits[i];
        s.click(function (e) {
            submit_form();
            e.preventDefault();
            return false;
        });
    }


    // Define keyboard event
    if (opts.form_group != null || opts.form_group.length > 0) {
        opts.fields = [];
        all_fields = $J("[fg=" + opts.form_group + "][ft!=submit]");
        for (var i = 0; i < all_fields.length; i++) {
            var f = $J(all_fields[i]);
            var found = false;
            for (var j = 0; j < opts.fields.length; j++) {
                var f_j = opts.fields[j];
                if (!isEmpty(f_j.attr("name"))) {
                    if (f_j.attr("name") == f.attr("name")) {
                        f_j.push(f[0]);
                        found = true;
                        break;
                    }
                }
            }
            if (found == false) opts.fields.push(f);
        }
    }
    for (var i = 0; i < opts.fields.length; i++) {
        var f = opts.fields[i];
        f.keydown(function (event) {

            // enter
            if (event.keyCode == 13) {
                submit_form();
                event.preventDefault();
                return false;
            }
        });
    }

    // Hide all feedback fields
    $J("[feedback_for]").hide();

    //################################################################

    // Find feedback from package returned from server
    // Display feedbacks beside corresponding fields
    function response(resp) {
        // Handle ValidationDataPackage

        // For asp.net webmethod, data stored in d
        resp = resp.d ? resp.d : resp;

        //
        if (typeof resp == "string") resp = jQuery.parseJSON(resp);
        var validationDataPackage = resp;
        var validationDataList = validationDataPackage.datalist;

        var success = true;

        for (var i = 0; i < opts.fields.length; i++) {
            var field = opts.fields[i];
            var validationData = find_validationData_for_element(field, validationDataList);
            var feedback_element = get_feedback_element(field);

            if (validationData) {
                if (opts.postback_update) {
                    field.val(validationData.value);
                }

                if (!isEmpty(validationData.message)) {
                    fill_feedback_element_from_validationData(feedback_element, validationData);
                    display_feedback_for_element(field, feedback_element);
                    success = false;
                }
                else {
                    hide_feedback_for_element(field);
                }

            }
            else {
                hide_feedback_for_element(field);
            }
        }

        if (!success) {
            if (opts.shake_when_error) {
                if (opts.form_wrapper != null || opts.form_wrapper.length > 0) {
                    opts.form_wrapper.effect("shake", { times: 3 }, 10);
                }
            }
        }
    }

    // Ajax request sends to server
    function submit_form() {
        if (opts.before_submit_fun != null) {
            if (defaults.before_submit_fun() == false)
                return;
        }

        if (opts.allow_submit) {
            //debug to see how json renders, NOT send actual request to server
            if (opts.simulate_postback_json != null) {
                response(opts.simulate_postback_json);
            }
            //actual send request to server
            else {
                var params = get_params();
                pageMethod(
                    url,
                    null,
                    params,
                    function (resp) {
                        response(resp);
                        opts.success_fun(resp);
                    },
                    function (xhr, ajaxOptions, thrownError) {
                        //alert(xhr.status + ", " + thrownError);
                        opts.error_fun(xhr, ajaxOptions, thrownError);
                    }
                );
            }


        }

    }


    // Helpers
    function get_params() {
        var dataList = [];
        for (var fields_i in opts.fields) {
            var field = opts.fields[fields_i];
            if (field.length == 0) continue;
            var id = field.attr('id');
            var name = field.attr('name');
            if (isEmpty(id)) id = name;
            var field_type = field.attr("type");
            if (!isEmpty(field_type)) field_type = field_type.toLowerCase();
            else field_type = "";
            var value = null;
            if (field_type == "radio") {
                value = field.filter(":checked").val();
            }
            else {
                value = field.val();
            }

            var obj = { id: id, name: name, value: value };
            dataList.push(obj);
        }
        validationDataPackage =
        {
            package: {
                id: opts.form_wrapper != null ? opts.form_wrapper.attr("id") : "",
                datalist: dataList,
                status: "submit"
            }
        };
        return validationDataPackage;
    }

    function find_validationData_for_element(field, validationDataList) {
        var result = null;
        //find from id
        for (var resp_i in validationDataList) {
            var validationData = validationDataList[resp_i];
            if (validationData.id == field.attr('id')) result = validationData;
        }

        //find from name
        if (result == null) {
            for (var resp_i in validationDataList) {
                var validationData = validationDataList[resp_i];
                if (validationData.id == field.attr('name')) result = validationData;
            }
        }

        return result;
    }

    function fill_feedback_element_from_validationData(feedback_element, validation_data) {
        if (!isEmpty(validation_data.message)) {
            feedback_element.html(validation_data.message);

            if (!isEmpty(validation_data.status)) {
                if (validation_data.status == "success") {
                    feedback_element.removeClass(opts.warning_css_class);
                    feedback_element.removeClass(opts.error_css_class);
                    feedback_element.addClass(opts.success_css_class);
                }
                else if (validation_data.status == "error") {
                    feedback_element.removeClass(opts.success_css_class);
                    feedback_element.removeClass(opts.warning_css_class);
                    feedback_element.addClass(opts.error_css_class);
                }
                else if (validation_data.status == "warning") {
                    feedback_element.removeClass(opts.success_css_class);
                    feedback_element.removeClass(opts.error_css_class);
                    feedback_element.addClass(opts.warning_css_class);
                }
            }
            else {
                feedback_element.removeClass(opts.warning_css_class);
                feedback_element.removeClass(opts.success_css_class);
                feedback_element.addClass(opts.error_css_class);
            }
        }
        else {
            feedback_element.html("");
        }
    }

    function get_feedback_element(origin_field_element) {
        var feedback_element;

        var feedback_for = origin_field_element.attr("id") || origin_field_element.attr("name");
        if ($J("[feedback_for=" + feedback_for + "]").length > 0) {
            feedback_element = $J("[feedback_for=" + feedback_for + "]").addClass(opts.feedback_css_class);
        }
        else {
            feedback_element = $J('<div>').attr('feedback_for', feedback_for).addClass(opts.feedback_css_class);
            if (opts.feedback_display_position != null) {
                if (typeof (opts.feedback_display_position) == "object") {
                    // Enforce position
                    var pos = $J.extend({
                        width: origin_field_element.outerWidth(),
                        height: origin_field_element.outerHeight()
                    }, origin_field_element.position());
                    feedback_element.css('position', 'absolute')
                                    .css('top', pos.top + opts.feedback_display_position.margin_top)
                                    .css('left', pos.left + pos.width + opts.feedback_display_position.margin_left);
                }
                if (typeof (opts.feedback_display_position) == "string") {
                    if (opts.feedback_display_position == "before") {
                        origin_field_element.first().before(feedback_element);
                    }
                    if (opts.feedback_display_position == "after") {
                        origin_field_element.last().after(feedback_element);
                    }
                }
            }
            else {
                // Handle error
            }

        }

        return feedback_element;
    }

    function display_feedback_for_element(origin_field_element, feedback_element) {
        /*
        if (opts.feedback_display_position != null) {
        if (typeof (opts.feedback_display_position) == "object") {
        if (origin_field_element.last().next() != feedback_element) {
        origin_field_element.last().after(feedback_element);
        }
        }
        if (typeof (opts.feedback_display_position) == "string") {
        if (opts.feedback_display_position == "before") {
        if (origin_field_element.first().prev() != feedback_element) {
        origin_field_element.first().before(feedback_element);
        }
        }
        if (opts.feedback_display_position == "after") {
        if (origin_field_element.last().next() != feedback_element) {
        origin_field_element.last().after(feedback_element);
        }
        }
        }
        }
        else {
        // Handle error
        }

        */
        feedback_element.fadeOut().fadeIn();
    }

    function hide_feedback_for_element(origin_field_element) {
        var feedback_element = get_feedback_element(origin_field_element);
        feedback_element.fadeOut();
    }

    function pageMethod(page, fn, params, successFn, errorFn, context, async) {
        if (!page) {
            page = window.location.href.split('#')[0];
            var queries = page.split('?');
            if (fn != null) {
                page = queries[0] + "/" + fn + ((queries.length > 1) ? "?" + queries[1] : "");
            }
            else {
                page = queries[0] + ((queries.length > 1) ? "?" + queries[1] : "");
            }
        }
        else {
            if (fn != null) page = page + "/" + fn;
        }


        // Show loading overlay, will take customized css if any
        var wrapper, pos, overlay;
        if (opts.show_loading) {
            /*
            // method1
            wrapper = $J('body');
            pos = $J.extend({
            width: wrapper.outerWidth(),
            height: wrapper.outerHeight()
            }, wrapper.position());
            overlay = $J('<div>');
            overlay.css('position', 'absolute').css('top', pos.top).css('left', pos.left);
            overlay.css('position', 'absolute').css('width', pos.width).css('height', pos.height);
            overlay.attr('class', opts.loading_css_class);
            overlay.hide();
            overlay.appendTo(wrapper);
            */

            //method2
            wrapper = $J('body');
            overlay = $J('<div>');
            overlay.css('position', 'absolute').css('top', 0).css('left', 0);
            overlay.css('position', 'absolute').css('width', window.screen.width).css('height', window.screen.height);
            overlay.css('background', '#666666 50% 50% repeat').css('opacity', '0.50').css('filter', 'Alpha(Opacity=50)');

            overlay.attr('class', opts.loading_css_class);
            overlay.hide();
            overlay.appendTo(wrapper);
        }

        // Initialize loading spinner
        var loading_spinner = null;
        if (opts.show_loading) loading_spinner = new Spinner(opts.loading_spinner_opts);

        //
        $J.ajax({
            type: "POST",
            url: page,
            data: (params) ? (((typeof params) == "string") ? params : JsonStringify(params)) : "{}",
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: ((successFn) ? function (val) {
                successFn(val, context);
            } : null),
            error: errorFn,
            async: ((typeof async) === "boolean") ? async : true,
            beforeSend: function () {
                if (opts.allow_submit) {
                    setAllSubmitButtons("disable");
                    opts.allow_submit = false;
                    if (opts.show_loading) {
                        if (overlay != null || overlay.length > 0) {
                            overlay.show();
                            loading_spinner.spin(body);
                        }
                    }
                }
            },
            complete: function () {
                if (opts.show_loading) {
                    setInterval(function () {
                        if (overlay != null) {
                            overlay.fadeOut("slow", function () {
                                overlay.remove();
                                setAllSubmitButtons("enable");
                                opts.allow_submit = true;
                                loading_spinner.stop();
                            });
                        }
                    }, opts.submit_interval);
                }
                else {
                    setAllSubmitButtons("enable");
                    opts.allow_submit = true;
                }
            }
        });
    }

    function setAllSubmitButtons(action) {
        if (action == "disable") {
            for (var i = 0; i < opts.submits.length; i++) {
                var b = opts.submits[i];
                b.attr("disabled", "disabled");
            }
        }
        if (action == "enable") {
            for (var i = 0; i < opts.submits.length; i++) {
                var b = opts.submits[i];
                b.removeAttr("disabled");
            }
        }

    }

    function isEmpty(str) {
        return (!str || 0 === str.length);
    }

    function JsonStringify(obj) {
        if (window["JSON"]) {
            return JSON.stringify(obj);
        }
        return Sys.Serialization.JavaScriptSerializer.serialize(obj);
    }


    // Define Objects
    function ValidationDataPackage() {
        this.id;
        this.name;
        this.data;
        this.status;
        this.message;
    }

    function ValidationData() {
        this.id;
        this.name;
        this.value;
        this.status;
        this.message;
    }

};


//fgnass.github.com/spin.js#v1.2.5
(function (a, b, c) { function g(a, c) { var d = b.createElement(a || "div"), e; for (e in c) d[e] = c[e]; return d } function h(a) { for (var b = 1, c = arguments.length; b < c; b++) a.appendChild(arguments[b]); return a } function j(a, b, c, d) { var g = ["opacity", b, ~ ~(a * 100), c, d].join("-"), h = .01 + c / d * 100, j = Math.max(1 - (1 - a) / b * (100 - h), a), k = f.substring(0, f.indexOf("Animation")).toLowerCase(), l = k && "-" + k + "-" || ""; return e[g] || (i.insertRule("@" + l + "keyframes " + g + "{" + "0%{opacity:" + j + "}" + h + "%{opacity:" + a + "}" + (h + .01) + "%{opacity:1}" + (h + b) % 100 + "%{opacity:" + a + "}" + "100%{opacity:" + j + "}" + "}", 0), e[g] = 1), g } function k(a, b) { var e = a.style, f, g; if (e[b] !== c) return b; b = b.charAt(0).toUpperCase() + b.slice(1); for (g = 0; g < d.length; g++) { f = d[g] + b; if (e[f] !== c) return f } } function l(a, b) { for (var c in b) a.style[k(a, c) || c] = b[c]; return a } function m(a) { for (var b = 1; b < arguments.length; b++) { var d = arguments[b]; for (var e in d) a[e] === c && (a[e] = d[e]) } return a } function n(a) { var b = { x: a.offsetLeft, y: a.offsetTop }; while (a = a.offsetParent) b.x += a.offsetLeft, b.y += a.offsetTop; return b } var d = ["webkit", "Moz", "ms", "O"], e = {}, f, i = function () { var a = g("style"); return h(b.getElementsByTagName("head")[0], a), a.sheet || a.styleSheet } (), o = { lines: 12, length: 7, width: 5, radius: 10, rotate: 0, color: "#000", speed: 1, trail: 100, opacity: .25, fps: 20, zIndex: 2e9, className: "spinner", top: "auto", left: "auto" }, p = function q(a) { if (!this.spin) return new q(a); this.opts = m(a || {}, q.defaults, o) }; p.defaults = {}, m(p.prototype, { spin: function (a) { this.stop(); var b = this, c = b.opts, d = b.el = l(g(0, { className: c.className }), { position: "relative", zIndex: c.zIndex }), e = c.radius + c.length + c.width, h, i; a && (a.insertBefore(d, a.firstChild || null), i = n(a), h = n(d), l(d, { left: (c.left == "auto" ? i.x - h.x + (a.offsetWidth >> 1) : c.left + e) + "px", top: (c.top == "auto" ? i.y - h.y + (a.offsetHeight >> 1) : c.top + e) + "px" })), d.setAttribute("aria-role", "progressbar"), b.lines(d, b.opts); if (!f) { var j = 0, k = c.fps, m = k / c.speed, o = (1 - c.opacity) / (m * c.trail / 100), p = m / c.lines; !function q() { j++; for (var a = c.lines; a; a--) { var e = Math.max(1 - (j + a * p) % m * o, c.opacity); b.opacity(d, c.lines - a, e, c) } b.timeout = b.el && setTimeout(q, ~ ~(1e3 / k)) } () } return b }, stop: function () { var a = this.el; return a && (clearTimeout(this.timeout), a.parentNode && a.parentNode.removeChild(a), this.el = c), this }, lines: function (a, b) { function e(a, d) { return l(g(), { position: "absolute", width: b.length + b.width + "px", height: b.width + "px", background: a, boxShadow: d, transformOrigin: "left", transform: "rotate(" + ~ ~(360 / b.lines * c + b.rotate) + "deg) translate(" + b.radius + "px" + ",0)", borderRadius: (b.width >> 1) + "px" }) } var c = 0, d; for (; c < b.lines; c++) d = l(g(), { position: "absolute", top: 1 + ~(b.width / 2) + "px", transform: b.hwaccel ? "translate3d(0,0,0)" : "", opacity: b.opacity, animation: f && j(b.opacity, b.trail, c, b.lines) + " " + 1 / b.speed + "s linear infinite" }), b.shadow && h(d, l(e("#000", "0 0 4px #000"), { top: "2px" })), h(a, h(d, e(b.color, "0 0 1px rgba(0,0,0,.1)"))); return a }, opacity: function (a, b, c) { b < a.childNodes.length && (a.childNodes[b].style.opacity = c) } }), !function () { function a(a, b) { return g("<" + a + ' xmlns="urn:schemas-microsoft.com:vml" class="spin-vml">', b) } var b = l(g("group"), { behavior: "url(#default#VML)" }); !k(b, "transform") && b.adj ? (i.addRule(".spin-vml", "behavior:url(#default#VML)"), p.prototype.lines = function (b, c) { function f() { return l(a("group", { coordsize: e + " " + e, coordorigin: -d + " " + -d }), { width: e, height: e }) } function k(b, e, g) { h(i, h(l(f(), { rotation: 360 / c.lines * b + "deg", left: ~ ~e }), h(l(a("roundrect", { arcsize: 1 }), { width: d, height: c.width, left: c.radius, top: -c.width >> 1, filter: g }), a("fill", { color: c.color, opacity: c.opacity }), a("stroke", { opacity: 0 })))) } var d = c.length + c.width, e = 2 * d, g = -(c.width + c.length) * 2 + "px", i = l(f(), { position: "absolute", top: g, left: g }), j; if (c.shadow) for (j = 1; j <= c.lines; j++) k(j, -2, "progid:DXImageTransform.Microsoft.Blur(pixelradius=2,makeshadow=1,shadowopacity=.3)"); for (j = 1; j <= c.lines; j++) k(j); return h(b, i) }, p.prototype.opacity = function (a, b, c, d) { var e = a.firstChild; d = d.shadow && d.lines || 0, e && b + d < e.childNodes.length && (e = e.childNodes[b + d], e = e && e.firstChild, e = e && e.firstChild, e && (e.opacity = c)) }) : f = k(b, "animation") } (), a.Spinner = p })(window, document);


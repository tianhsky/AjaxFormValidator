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
 * This is dual licensed under the MIT and GPL licenses:
 * 	http://www.opensource.org/licenses/mit-license.php
 *	http://www.gnu.org/licenses/gpl.html
 */

$J = jQuery != null ? jQuery : null; //to avoid $ alias conflict with other lib
var AjaxFormValidator = function (url, options) {

    // Default options
    var defaults = {
        url:null, //required: where request sends to
        fields:null, //required: list of form fields in jQuery
        submits:null, //optional: list of submit buttons in jQuery
        form_wrapper:null, //optional: outer wrapper element of the form in jQuery
        submit_interval:2000, //optional: interval between each submit event

        success_fun:function (resp) {
        }, //optional: customized add-on function for success post back
        error_fun:function (xhr, ajaxOptions, thrownError) {
        }, //optional: customized add-on function for error post back
        simulate_postback_json:null, //optional: without server side code written, just want to see how it renders the json

        show_loading:true, //optional: show loading status when ajax is sending/receiving
        postback_update:false, //optional: update form fields with data returned from server
        allow_submit:true, //optional: allow enter or button click to submit form

        feedback_css_class:"feedback_css_class", //optional: the css class for displaying feedback message
        loading_css_class:"loading_css_class", //optional: the css class for displaying loading message

        start:function () {
        }
    };

    // Combine customized options with default options
    var opts = $J.extend(defaults, options);


    // Define button events
    for (var i in opts.submits) {
        var s = opts.submits[i];
        s.click(function (e) {
            submit_form();
            e.preventDefault();
            return false;
        });
    }

    // Define keyboard event
    for (var fields_i in opts.fields) {
        var f = opts.fields[fields_i];
        f.keydown(function (event) {

            // enter
            if (event.keyCode == 13) {
                submit_form();
                event.preventDefault();
                return false;
            }
        });
    }

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

        for (var fields_i in opts.fields) {
            var field = opts.fields[fields_i];
            var validationData = find_validationData_for_element(field, validationDataList);
            var feedback_element = get_feedback_element(field);

            if (validationData) {
                if (opts.postback_update) {
                    field.val(validationData.value);
                }

                if (!isEmpty(validationData.message)) {
                    fill_feedback_element_from_validationData(feedback_element, validationData);
                    display_feedback_for_element(field, feedback_element);
                }
                else {
                    hide_feedback_for_element(field);
                }

            }
            else {
                hide_feedback_for_element(field);
            }
        }
    }

    // Ajax request sends to server
    function submit_form() {
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
            var id = field.attr('id');
            var name = field.attr('name');
            if (isEmpty(id)) id = name;
            var value = field.val();
            var obj = { id:id, name:name, value:value };
            dataList.push(obj);
        }
        validationDataPackage =
        {
            package:{
                id:opts.form_wrapper != null ? opts.form_wrapper.attr("id") : "",
                datalist:dataList,
                status:"send"
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
        }
        else {
            feedback_element.html("");
        }
    }

    function get_feedback_element(origin_field_element) {
        var feedback_element = origin_field_element.next();
        if (feedback_element < 0) {
            feedback_element = $J('<div>').attr('class', opts.feedback_css_class);
        }
        else {
            if (!feedback_element.hasClass(opts.feedback_css_class)) {
                feedback_element = $J('<div>').attr('class', opts.feedback_css_class);
            }
        }
        return feedback_element;
    }

    function display_feedback_for_element(origin_field_element, feedback_element) {
        if (origin_field_element.next() != feedback_element) {
            origin_field_element.after(feedback_element);
        }
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
            wrapper = opts.form_wrapper;
            wrapper = wrapper != null ? wrapper : $J('body');
            pos = $J.extend({
                width:wrapper.outerWidth(),
                height:wrapper.outerHeight()
            }, wrapper.position());
            overlay = $J('<div>');
            overlay.attr('class', opts.loading_css_class);
            overlay.css('position', 'absolute').css('top', pos.top).css('left', pos.left);
            //if(overlay.width() <= 0) overlay.css('width',pos.width) ;
            //if(overlay.height() <= 0) overlay.css('height',pos.height) ;
            overlay.hide();
            overlay.appendTo(wrapper);
        }


        //
        $J.ajax({
            type:"POST",
            url:page,
            data:(params) ? (((typeof params) == "string") ? params : JsonStringify(params)) : "{}",
            contentType:"application/json; charset=utf-8",
            dataType:"json",
            success:((successFn) ? function (val) {
                successFn(val, context);
            } : null),
            error:errorFn,
            async:((typeof async) === "boolean") ? async : true,
            beforeSend:function () {
                if (opts.allow_submit) {
                    opts.allow_submit = false;
                    if (overlay != null) overlay.fadeIn();
                }


            },
            complete:function () {
                setInterval(function () {
                    opts.allow_submit = true;
                    if (overlay != null) overlay.fadeOut();
                    setInterval(function () {
                        overlay.remove()
                    }, 2000);
                }, opts.submit_interval);


            }
        });
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

# AjaxFormValidator

A plugin written in JavaScript to handle form submissions and automatically render messages returned in JSON for each input element.

## How to use it
	<script>
	  // To avoid $ alias conflict with other lib
	    $J = jQuery != null ? jQuery : null;

	  // Register page element
	    $J(function ($) {
		AjaxFormValidator("http://127.0.0.1:3000/Test",
		        {
		            fields:[$('#email'), $('#pass')],
		            submits:[$('#submit')],
		            form_wrapper:$('#sample_form')
		        });
	    });
	</script>


	<div id="sample_form">
	  <input id="email"  placeholder="email"/>
	  <input id="pass" type="password" placeholder="password"/>
	  <input id="submit" type="button" value="Submit"/>
	</div>

## Dependencies

This plugin requires jQuery.

## License

This is dual licensed under the MIT and GPL licenses.

## Authors

Originally developed by Tianyu Huang.

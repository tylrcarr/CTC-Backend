// nothing now
$(document).ready(function(){
	$("#sendData").on("click", submitData);
	$("#home-nav").on("click", function(){showDiv("home")});
	$("#services-nav").on("click", function(){showDiv("services")});
	$("#testimonials-nav").on("click", function(){showDiv("testimonials")});
	$("#about-nav").on("click", function(){showDiv("about")});
	$("#contact-nav").on("click", function(){showDiv("contact")});
	$('#characterLeft').text('140 characters left');
	$('#message').keydown(function () {
		var max = 140;
		var len = $(this).val().length;
		if (len >= max) {
		    $('#characterLeft').text('You have reached the limit');
		    $('#characterLeft').addClass('red');
		    $('#btnSubmit').addClass('disabled');            
		} 
		else {
		    var ch = max - len;
		    $('#characterLeft').text(ch + ' characters left');
		    $('#btnSubmit').removeClass('disabled');
		    $('#characterLeft').removeClass('red');            
		}
    	}); 
});
function showDiv(name) {
	if (name != $("#main .content:visible").attr("id")) {
		$(".nav-item.active").removeClass("active");
		$("#" + name + "-nav").parent().addClass("active");
		$("#main .content:visible").fadeOut("slow", function() {
			$("#" + name).fadeIn("slow");
		});
	}
}
function submitData() {
	var data = {
		"name": $("#name").val(),
		"phone": $("#mobile").val(),
		"message": $("#message").val(),
		"subject": $("#subject").val(),
		"email": $("#email").val()
	}
	console.log(data);
	$.post("/api/contact",data);
}

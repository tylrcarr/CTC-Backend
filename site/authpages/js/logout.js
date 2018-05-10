//nothing for now
$(document).ready(function(){
	$("#logout").on("click", function(){
		$.ajax({
			url: '/api/logout',
			type: 'DELETE',
			success: function(result) {
				window.location.href = "http://159.89.238.203:9000/";
			}
		});
	});
});

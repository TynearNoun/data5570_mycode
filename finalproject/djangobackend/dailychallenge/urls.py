from django.urls import path

from . import views

urlpatterns = [
    path("health/", views.HealthView.as_view(), name="health"),
    path("auth/register/", views.RegisterView.as_view(), name="register"),
    path("auth/login/", views.LoginView.as_view(), name="login"),
    path("auth/logout/", views.LogoutView.as_view(), name="logout"),
    path("users/me/", views.MeView.as_view(), name="me"),
    path("groups/", views.GroupListCreateView.as_view(), name="groups"),
    path("groups/join/", views.GroupJoinView.as_view(), name="group-join"),
    path("groups/<int:group_id>/", views.GroupDetailView.as_view(), name="group-detail"),
    path("challenges/", views.ChallengeListCreateView.as_view(), name="challenges"),
    path("challenges/daily/", views.DailyChallengeView.as_view(), name="daily-challenge"),
    path("challenges/<int:challenge_id>/", views.ChallengeDetailView.as_view(), name="challenge-detail"),
    path("submissions/", views.SubmissionListCreateView.as_view(), name="submissions"),
    path("submissions/<int:submission_id>/", views.SubmissionDetailView.as_view(), name="submission-detail"),
    path("reactions/", views.ReactionListCreateView.as_view(), name="reactions"),
    path("reactions/<int:reaction_id>/", views.ReactionDetailView.as_view(), name="reaction-detail"),
    path("messages/", views.MessageListCreateView.as_view(), name="messages"),
    path("leaderboard/", views.LeaderboardView.as_view(), name="leaderboard"),
]

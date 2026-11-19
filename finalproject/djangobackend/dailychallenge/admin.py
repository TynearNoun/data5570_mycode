from django.contrib import admin

from .models import Challenge, FriendGroup, Membership, Message, PointEvent, Profile, Reaction, Submission


class MembershipInline(admin.TabularInline):
    model = Membership
    extra = 0


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("display_name", "user", "created_at")
    search_fields = ("display_name", "user__username")


@admin.register(FriendGroup)
class FriendGroupAdmin(admin.ModelAdmin):
    list_display = ("name", "invite_code", "created_by", "created_at")
    search_fields = ("name", "invite_code")
    inlines = [MembershipInline]


@admin.register(Challenge)
class ChallengeAdmin(admin.ModelAdmin):
    list_display = ("title", "group", "kind", "proof", "challenge_date")
    list_filter = ("kind", "proof")


@admin.register(Submission)
class SubmissionAdmin(admin.ModelAdmin):
    list_display = ("user", "challenge", "created_at")
    search_fields = ("body", "user__username")


@admin.register(Reaction)
class ReactionAdmin(admin.ModelAdmin):
    list_display = ("kind", "user", "submission", "created_at")


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("group", "user", "created_at")


@admin.register(PointEvent)
class PointEventAdmin(admin.ModelAdmin):
    list_display = ("user", "group", "points", "reason", "created_at")
    list_filter = ("reason",)

from django.contrib import admin
from django.template.response import TemplateResponse
from django.urls import path, reverse

from .models import Challenge, FriendGroup, Membership, Message, PointEvent, Profile, Reaction, Submission
from .prompts import PROMPTS


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


def dare_bank_view(request):
    context = {
        **admin.site.each_context(request),
        "title": "Challenges List",
        "dares": [
            {"number": index, "title": title, "prompt": prompt, "proof": proof}
            for index, (title, prompt, proof) in enumerate(PROMPTS, start=1)
        ],
    }
    return TemplateResponse(request, "admin/dare_bank.html", context)


_original_get_urls = admin.site.get_urls


def _get_urls():
    return [
        path("dares/", admin.site.admin_view(dare_bank_view), name="dare-bank"),
    ] + _original_get_urls()


admin.site.get_urls = _get_urls

_original_get_app_list = admin.site.get_app_list


def _get_app_list(request, app_label=None):
    app_list = _original_get_app_list(request, app_label)
    dare_link = {
        "name": "Challenges List",
        "object_name": "DareBank",
        "perms": {"add": False, "change": False, "delete": False, "view": True},
        "admin_url": reverse("admin:dare-bank"),
        "add_url": None,
        "view_only": True,
    }
    for app in app_list:
        if app["app_label"] == "rally":
            app["models"].append(dare_link)
            app["models"].sort(key=lambda model: model["name"])
            return app_list
    if app_label in (None, "rally"):
        app_list.append(
            {
                "name": "Daily Challenge",
                "app_label": "rally",
                "app_url": reverse("admin:app_list", kwargs={"app_label": "rally"}),
                "has_module_perms": True,
                "models": [dare_link],
            }
        )
    return app_list


admin.site.get_app_list = _get_app_list

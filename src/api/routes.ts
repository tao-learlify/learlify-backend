import { ApplicationInterfaceService } from '../router'

import Access from 'api/access/access.routes'
import Admin from 'api/admin/admin.routes'
import Advance from 'api/advance/advance.routes'
import Auth from 'api/authentication/authentication.routes'
import AWS from 'api/aws/aws.routes'
import Categories from 'api/categories/categories.routes'
import Classes from 'api/classes/classes.routes'
import Courses from 'api/courses/courses.routes'
import Evaluations from 'api/evaluations/evaluations.routes'
import Exams from 'api/exams/exams.routes'
import Feedback from 'api/feedback/feedback.routes'
import Gifts from 'api/gifts/gifts.routes'
import Languages from 'api/languages/language.routes'
import LatestEvaluations from 'api/latest-evaluations/latestEvaluations.routes'
import Meetings from 'api/meetings/meetings.routes'
import Models from 'api/models/models.routes'
import Notifications from 'api/notifications/notifications.routes'
import Packages from 'api/packages/packages.routes'
import Plans from 'api/plans/plans.routes'
import Progress from 'api/progress/progress.routes'
import Reports from 'api/reports/report.routes'
import Roles from 'api/roles/roles.routes'
import Schedules from 'api/schedule/schedule.routes'
import Stats from 'api/stats/stats.routes'
import Users from 'api/users/users.routes'
import Youtube from 'api/youtube/youtube.routes'

const controllers = new ApplicationInterfaceService({
  controllers: [
    Access,
    Admin,
    Advance,
    Auth,
    AWS,
    Categories,
    Classes,
    Courses,
    Evaluations,
    Exams,
    Feedback,
    Gifts,
    Languages,
    LatestEvaluations,
    Meetings,
    Models,
    Notifications,
    Packages,
    Plans,
    Progress,
    Reports,
    Roles,
    Schedules,
    Stats,
    Users,
    Youtube
  ]
})

const AppRootHandler = controllers.applyRouterManagement()

export default AppRootHandler
